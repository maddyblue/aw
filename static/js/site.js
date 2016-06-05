(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Main = React.createClass({
	displayName: 'Main',

	getInitialState: function () {
		return {
			Windows: [],
			Results: [],
			Scope: localStorage.getItem('scope') || '',
			Exclude: localStorage.getItem('exclude') || '_test.go',
			Include: localStorage.getItem('include') || ''
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
			body: body
		}).then(function (data) {
			this.setState({ Results: [data].concat(this.state.Results) });
		}.bind(this));
	},
	setScope: function (event) {
		var v = event.target.value;
		localStorage.setItem('scope', v);
		this.setState({ Scope: v });
	},
	setExcludeFilter: function (event) {
		var v = event.target.value;
		localStorage.setItem('exclude', v);
		this.setState({ Exclude: v });
	},
	setIncludeFilter: function (event) {
		var v = event.target.value;
		localStorage.setItem('include', v);
		this.setState({ Include: v });
	},
	clearAll: function () {
		this.setState({ Results: [] });
	},
	clear: function (idx) {
		this.setState({ Results: this.state.Results.filter(function (x, i) {
				return i != idx;
			}) });
	},
	render: function () {
		var that = this;
		var windows = this.state.Windows.map(function (w) {
			var buttons = buttonTypes.map(function (c) {
				var name = c[0];
				var tooltip = c[1];
				return React.createElement(
					'button',
					{ key: name, title: tooltip, style: btnStyle, onClick: function () {
							that.command(name, w.ID);
						} },
					name
				);
			});
			var filename = React.createElement(
				'span',
				{ title: w.Name },
				w.Name.substr(w.Name.lastIndexOf('/') + 1)
			);
			return React.createElement(
				'tr',
				{ key: w.ID },
				React.createElement(
					'td',
					null,
					filename,
					':'
				),
				React.createElement(
					'td',
					null,
					buttons
				)
			);
		});
		return React.createElement(
			'div',
			null,
			React.createElement(
				'table',
				null,
				React.createElement(
					'tbody',
					null,
					windows
				)
			),
			React.createElement(
				'button',
				{ onClick: this.clearAll },
				'clear all'
			),
			' | guru scope: ',
			React.createElement('input', { style: { marginBottom: '10px', width: '300px' }, onChange: this.setScope, value: this.state.Scope }),
			'  | exclude: ',
			React.createElement('input', { style: { width: '100px' }, onChange: this.setExcludeFilter, value: this.state.Exclude }),
			'  | include: ',
			React.createElement('input', { style: { width: '100px' }, onChange: this.setIncludeFilter, value: this.state.Include }),
			React.createElement('hr', null),
			React.createElement(Results, { results: this.state.Results, clear: this.clear, exclude: this.state.Exclude, include: this.state.Include })
		);
	}
});

var buttonTypes = [['definition', 'go to definition'], ['describe', 'describe selected syntax: definition, methods, etc'], ['docs', 'documentation of selected identifier'], ['callees', 'show possible targets of selected function call'], ['callers', 'show possible callers of selected function'], ['callstack', 'show path from callgraph root to selected function'], ['definition', 'show declaration of selected identifier'], ['freevars', 'show free variables of selection'], ['implements', 'show \'implements\' relation for selected type or method'], ['peers', 'show send/receive corresponding to selected channel op'], ['pointsto', 'show variables the selected pointer may point to'], ['referrers', 'show all refs to entity denoted by selected identifier'], ['what', 'show basic information about the selected syntax node'], ['whicherrs', 'show possible values of the selected error variable']];

var Results = React.createClass({
	displayName: 'Results',

	render: function () {
		var that = this;
		var results = this.props.results.map(function (r, idx) {
			var content;
			if (r.Lines) {
				var lines = [];
				r.Data.trim().split('\n').forEach(function (line, lidx) {
					var sp = line.split(': ');
					var pos = sp[0];
					if (that.props.exclude && pos.match(that.props.exclude)) {
						return;
					}
					if (that.props.include && !pos.match(that.props.include)) {
						return;
					}
					var text = sp.slice(1).join(': ');
					lines.push(React.createElement(
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
					));
				});
				content = React.createElement(
					'table',
					null,
					React.createElement(
						'tbody',
						{ style: { verticalAlign: 'top' } },
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
					React.createElement(Pos, { pos: r.Pos }),
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
	whiteSpace: 'pre-wrap',
	margin: 0
};

var resultStyle = {
	padding: '10px'
};

var btnStyle = {
	marginLeft: '5px'
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
		match = this.props.pos.match(/(.*):(.*)/);
		if (!pos && match) {
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
