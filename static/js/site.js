(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Main = React.createClass({
	displayName: 'Main',

	getInitialState: function () {
		return {
			Windows: [],
			Results: [],
			Scope: localStorage.getItem('scope')
		};
	},
	componentDidMount: function () {
		var loc = 'ws://' + location.host + '/ws';
		console.log('connect to', loc);
		var s = new WebSocket(loc);
		s.onmessage = function (e) {
			v = JSON.parse(e.data);
			this.setState(v);
		}.bind(this);
		s.onclose = function () {
			s.close();
			setTimeout(this.open, 2000);
		}.bind(this);
	},
	command: function (cmd, id) {
		var body = new FormData();
		body.set('command', cmd);
		body.set('id', id);
		body.set('scope', this.state.Scope);
		Fetch('command', {
			method: 'POST',
			body: body,
			headers: {
				'Accept': 'application/json'
			}
		}).then(function (data) {
			this.setState({ Results: [data].concat(this.state.Results) });
		}.bind(this));
	},
	setScope: function (event) {
		var v = event.target.value;
		localStorage.setItem('scope', v);
		this.setState({ Scope: v });
	},
	clear: function (idx) {
		this.setState({ Results: this.state.Results.filter(function (x, i) {
				return i != idx;
			}) });
	},
	render: function () {
		var that = this;
		var windows = this.state.Windows.map(function (w) {
			var name = w.Name.substr(w.Name.lastIndexOf('/') + 1);
			var buttons = ['describe', 'docs', 'referrers', 'definition', 'implements', 'callees', 'callers', 'callstack', 'pointsto', 'whicherrs', 'what'].map(function (c) {
				return React.createElement(
					'button',
					{ key: c, style: btnStyle, onClick: function () {
							that.command(c, w.ID);
						} },
					c
				);
			});
			return React.createElement(
				'div',
				{ style: nameDivStyle, key: w.ID },
				name,
				':',
				buttons
			);
		});
		return React.createElement(
			'div',
			null,
			'guru scope: ',
			React.createElement('input', { style: { marginBottom: '10px', width: '500px' }, onChange: this.setScope, value: this.state.Scope }),
			windows,
			React.createElement('hr', null),
			React.createElement(Results, { results: this.state.Results, clear: this.clear })
		);
	}
});

var Results = React.createClass({
	displayName: 'Results',

	render: function () {
		var that = this;
		var results = this.props.results.map(function (r, idx) {
			var content;
			if (r.Lines) {
				var lines = r.Data.trim().split('\n').map(function (line, lidx) {
					var sp = line.split(': ');
					var pos = sp[0];
					var text = sp.slice(1).join(': ');
					return React.createElement(
						'tr',
						{ key: lidx },
						React.createElement(
							'td',
							null,
							React.createElement(Pos, { pos: pos })
						),
						React.createElement(
							'td',
							null,
							React.createElement(
								'pre',
								{ style: preStyle },
								text
							)
						)
					);
				});
				content = React.createElement(
					'table',
					null,
					React.createElement(
						'tbody',
						null,
						lines
					)
				);
			} else {
				content = React.createElement(
					'pre',
					{ style: preStyle },
					r.Data
				);
			}
			return React.createElement(
				'div',
				{ key: idx },
				React.createElement(
					'div',
					{ style: resultNameStyle },
					r.Pos,
					' ',
					r.Name,
					React.createElement(
						'button',
						{ style: btnStyle, onClick: function () {
								that.props.clear(idx);
							} },
						'clear'
					)
				),
				React.createElement(
					'div',
					{ style: {} },
					r.Pre,
					React.createElement(
						'b',
						null,
						r.Context
					),
					r.Post
				),
				React.createElement(
					'div',
					{ style: resultStyle },
					content
				)
			);
		});
		return React.createElement(
			'div',
			null,
			results
		);
	}
});

var contextStyle = {
	fontWeight: 'bold',
	padding: '2px'
};

var resultNameStyle = {
	backgroundColor: '#efefef',
	padding: '2px'
};

var preStyle = {
	fontFamily: 'sans-serif',
	margin: 0
};

var resultStyle = {
	padding: '10px'
};

var nameDivStyle = {
	marginBottom: '5px'
};

var btnStyle = {
	marginLeft: '10px'
};

function Fetch(path, params) {
	return fetch('/api/' + path, params).catch(function (error) {
		alert(error);
	}).then(function (resp) {
		return resp.json();
	});
}

var Pos = React.createClass({
	displayName: 'Pos',

	render: function () {
		var pos;
		var match = this.props.pos.match(/(.*):(.*)\.(.*)-(.*)/);
		if (match) {
			pos = match[1] + ':' + match[2];
		}
		match = this.props.pos.match(/(.*):(.*):(.*)/);
		if (match) {
			pos = this.props.pos;
		}
		if (!pos) {
			return React.createElement(
				'span',
				null,
				this.props.pos
			);
		}
		return React.createElement(
			'a',
			{ href: pos, onClick: open(pos) },
			this.props.pos
		);
	}
});

function open(pos) {
	return function (e) {
		e.preventDefault();
		Fetch('open', { method: 'POST', body: pos });
	};
}

ReactDOM.render(React.createElement(
	'div',
	{ style: { fontFamily: 'sans-serif' } },
	React.createElement(Main, null)
), document.getElementById('main'));

},{}]},{},[1]);
