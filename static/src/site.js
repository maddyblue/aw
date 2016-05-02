var Main = React.createClass({
	getInitialState: function() {
		return {
			Windows: [],
			Results: [],
			Scope: localStorage.getItem('scope')
		};
	},
	componentDidMount: function() {
		var loc = 'ws://' + location.host + '/ws';
		console.log('connect to', loc);
		var s = new WebSocket(loc);
		s.onmessage = function(e) {
			v = JSON.parse(e.data);
			this.setState(v);
		}.bind(this);
		s.onclose = function() {
			s.close();
			setTimeout(this.open, 2000);
		}.bind(this);
	},
	command: function(cmd, id) {
		var body = new FormData();
		body.set('command', cmd);
		body.set('id', id);
		body.set('scope', this.state.Scope);
		Fetch('command', {
			method: 'POST',
			body: body
		}).then(function(data) {
			this.setState({Results: [data].concat(this.state.Results)});
		}.bind(this));
	},
	setScope: function(event) {
		var v = event.target.value;
		localStorage.setItem('scope', v);
		this.setState({Scope: v});
	},
	clearAll: function() {
		this.setState({Results: []});
	},
	clear: function(idx) {
		this.setState({Results: this.state.Results.filter(function(x, i) {
			return i != idx;
		})});
	},
	render: function() {
		var that = this;
		var windows = this.state.Windows.map(function(w) {
			var name = w.Name.substr(w.Name.lastIndexOf('/') + 1);
			var buttons = ['describe', 'docs', 'referrers', 'definition', 'implements', 'callees', 'callers', 'callstack', 'pointsto', 'whicherrs', 'what'].map(function(c) {
				return <button key={c} style={btnStyle} onClick={function() {that.command(c, w.ID)}}>{c}</button>;
			});
			return (
				<div style={nameDivStyle} key={w.ID}>
					{name}:
					{buttons}
				</div>
			);
		});
		return (
			<div>
				{windows}
				<button onClick={this.clearAll}>clear all</button>
				&nbsp;| guru scope: <input style={{marginBottom: '10px', width: '500px'}} onChange={this.setScope} value={this.state.Scope} />
				<hr/>
				<Results results={this.state.Results} clear={this.clear}/>
			</div>
		);
	}
});

var Results = React.createClass({
	render: function() {
		var that = this;
		var results = this.props.results.map(function(r, idx) {
			var content;
			if (r.Lines) {
				var lines = r.Data.trim().split('\n').map(function(line, lidx) {
					var sp = line.split(': ');
					var pos = sp[0];
					var text = sp.slice(1).join(': ');
					return (
						<tr key={lidx}>
							<td><Pos pos={pos}/></td>
							<td><pre style={preStyle}>{text}</pre></td>
						</tr>
					);
				});
				content = (
					<table>
						<tbody>{lines}</tbody>
					</table>
				);
			} else {
				content = <pre style={preStyle}>{r.Data}</pre>;
			}
			return (
				<div key={idx}>
					<div style={resultNameStyle}>
						<Pos pos={r.Pos}/> {r.Name}
						<button style={btnStyle} onClick={function() { that.props.clear(idx); }}>clear</button>
					</div>
					<div style={{}}>{r.Pre}<b>{r.Context}</b>{r.Post}</div>
					<div style={resultStyle}>
						{content}
					</div>
				</div>
			);
		});
		return <div>{results}</div>;
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

var nameDivStyle = {
	marginBottom: '5px'
};

var btnStyle = {
	marginLeft: '10px'
};

function Fetch(path, params) {
	return fetch('/api/' + path, params)
	.catch(function (error) {
		alert(error);
	})
	.then(function(resp) {
		return resp.json();
	});
}

var Pos = React.createClass({
	render: function() {
		var pos;
		var match = this.props.pos.match(/(.*):(.*)\.(.*)-(.*)/);
		if (match) {
			pos = match[1] + ':' + match[2];
		}
		match = this.props.pos.match(/(.*):(.*)/);
		if (match) {
			pos = this.props.pos;
		}
		if (!pos) {
			return <span>{this.props.pos}</span>;
		}
		return <a href={pos} onClick={open(pos)}>{this.props.pos}</a>;
	}
});

function open(pos) {
	return function(e) {
		e.preventDefault();
		Fetch('open', { method: 'POST', body: pos });
	};
}

ReactDOM.render(
	<div style={{fontFamily: 'sans-serif'}}>
		<Main />
	</div>,
	document.getElementById('main')
);
