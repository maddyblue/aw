var Main = React.createClass({
	getInitialState: function() {
		return {
			Windows: [],
			Results: [],
			Scope: localStorage.getItem('scope') || '',
			Exclude: localStorage.getItem('exclude') || '_test.go',
			Include: localStorage.getItem('include') || '',
			Find: '',
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
			body: body,
		}).then(
			function(data) {
				this.setState({ Results: [data].concat(this.state.Results) });
			}.bind(this)
		);
	},
	setScope: function(event) {
		var v = event.target.value;
		localStorage.setItem('scope', v);
		this.setState({ Scope: v });
	},
	setExcludeFilter: function(event) {
		var v = event.target.value;
		localStorage.setItem('exclude', v);
		this.setState({ Exclude: v });
	},
	setIncludeFilter: function(event) {
		var v = event.target.value;
		localStorage.setItem('include', v);
		this.setState({ Include: v });
	},
	clearAll: function() {
		this.setState({ Results: [] });
		this.clearFind();
	},
	clear: function(idx) {
		this.setState({
			Results: this.state.Results.filter(function(x, i) {
				return i != idx;
			}),
		});
	},
	setFind: function(event) {
		var v = event.target.value;
		this.setState({
			Find: v,
			Found: null,
		});
		if (v.length < 3) {
			return;
		}
		var body = new FormData();
		body.set('find', v);
		body.set('scope', this.state.Scope);
		Fetch('find', {
			method: 'POST',
			body: body,
		}).then(
			function(data) {
				if (!data || data.Input != v) {
					return;
				}
				this.setState({ Found: data.Found });
			}.bind(this)
		);
	},
	findPress: function(e) {
		if (e.key === 'Enter') {
			if (!this.state.Found || this.state.Found.length < 1) {
				return;
			}
			open(this.state.Found[0], this.clearFind)(e);
		}
	},
	clearFind: function() {
		this.setState({
			Found: null,
			Find: '',
		});
	},
	render: function() {
		var that = this;
		var windows = this.state.Windows.map(function(w) {
			var buttons = buttonTypes.map(function(c) {
				var name = c[0];
				var tooltip = c[1];
				return (
					<button
						key={name}
						title={tooltip}
						style={btnStyle}
						onClick={function() {
							that.command(name, w.ID);
						}}
					>
						{name}
					</button>
				);
			});
			var filename = (
				<span title={w.Name}>{w.Name.substr(w.Name.lastIndexOf('/') + 1)}</span>
			);
			return (
				<tr key={w.ID}>
					<td>{filename}:</td>
					<td>{buttons}</td>
				</tr>
			);
		});
		return (
			<div>
				<table>
					<tbody>{windows}</tbody>
				</table>
				<button onClick={this.clearAll}>clear all</button>
				&nbsp;| guru scope:{' '}
				<input
					style={{ marginBottom: '10px', width: '300px' }}
					onChange={this.setScope}
					value={this.state.Scope}
				/>
				&nbsp; | exclude:{' '}
				<input
					style={{ width: '100px' }}
					onChange={this.setExcludeFilter}
					value={this.state.Exclude}
				/>
				&nbsp; | include:{' '}
				<input
					style={{ width: '100px' }}
					onChange={this.setIncludeFilter}
					value={this.state.Include}
				/>
				&nbsp; | find:{' '}
				<input
					style={{ width: '100px' }}
					onChange={this.setFind}
					onKeyPress={this.findPress}
					value={this.state.Find}
				/>
				<hr />
				<Found
					found={this.state.Found}
					find={this.state.Find}
					clear={this.clearFind}
				/>
				<Results
					results={this.state.Results}
					clear={this.clear}
					exclude={this.state.Exclude}
					include={this.state.Include}
				/>
			</div>
		);
	},
});

var Found = React.createClass({
	render: function() {
		if (!this.props.find || this.props.find.length < 3) {
			return null;
		}
		var that = this;
		var found = this.props.found || [];
		var results = found.map(function(r, idx) {
			return (
				<div key={r}>
					<a href={r} onClick={open(r, that.props.clear)}>
						{r}
					</a>
				</div>
			);
		});
		return (
			<div>
				<h2>
					find {this.props.find} (
					{this.props.found ? this.props.found.length : '...'})
				</h2>
				{results}
				<hr />
			</div>
		);
	},
});

var buttonTypes = [
	['definition', 'go to definition'],
	['describe', 'describe selected syntax: definition, methods, etc'],
	['docs', 'documentation of selected identifier'],

	['callees', 'show possible targets of selected function call'],
	['callers', 'show possible callers of selected function'],
	['callstack', 'show path from callgraph root to selected function'],
	['freevars', 'show free variables of selection'],
	['implements', "show 'implements' relation for selected type or method"],
	['peers', 'show send/receive corresponding to selected channel op'],
	['pointsto', 'show variables the selected pointer may point to'],
	['referrers', 'show all refs to entity denoted by selected identifier'],
	['what', 'show basic information about the selected syntax node'],
	['whicherrs', 'show possible values of the selected error variable'],
];

var Results = React.createClass({
	render: function() {
		var that = this;
		var results = this.props.results.map(function(r, idx) {
			var content;
			if (r.Lines) {
				var lines = [];
				r.Data.trim()
					.split('\n')
					.forEach(function(line, lidx) {
						var sp = line.split(': ');
						var pos = sp[0];
						if (that.props.exclude && pos.match(that.props.exclude)) {
							return;
						}
						if (that.props.include && !pos.match(that.props.include)) {
							return;
						}
						var text = sp.slice(1).join(': ');
						lines.push(
							<tr key={lidx}>
								<td>
									<div
										style={{
											maxWidth: '300px',
											overflow: 'hidden',
										}}
									>
										<div
											style={{
												float: 'right',
											}}
											title={pos}
										>
											<Pos pos={pos} />
										</div>
									</div>
								</td>
								<td>
									<pre style={preStyle}>{text}</pre>
								</td>
							</tr>
						);
					});
				content = (
					<table>
						<tbody style={{ verticalAlign: 'top' }}>{lines}</tbody>
					</table>
				);
			} else {
				content = <pre style={preStyle}>{r.Data}</pre>;
			}
			return (
				<div key={idx}>
					<div style={resultNameStyle}>
						<Pos pos={r.Pos} /> {r.Name}
						<button
							style={btnStyle}
							onClick={function() {
								that.props.clear(idx);
							}}
						>
							clear
						</button>
					</div>
					<div style={{}}>
						{r.Pre}
						<b>{r.Context}</b>
						{r.Post}
					</div>
					<div style={resultStyle}>{content}</div>
				</div>
			);
		});
		return <div>{results}</div>;
	},
});

var contextStyle = {
	fontWeight: 'bold',
	padding: '2px',
};

var resultNameStyle = {
	backgroundColor: '#efefef',
	padding: '2px',
};

var preStyle = {
	fontFamily: 'sans-serif',
	whiteSpace: 'pre-wrap',
	margin: 0,
};

var resultStyle = {
	padding: '10px',
};

var btnStyle = {
	marginLeft: '5px',
	padding: '1px',
	fontSize: 'small',
};

function Fetch(path, params) {
	return fetch('/api/' + path, params)
		.catch(function(error) {
			alert(error);
		})
		.then(function(resp) {
			if (resp.ok) {
				return resp.json();
			}
		});
}

var Pos = React.createClass({
	render: function() {
		if (this.props.pos.startsWith('http')) {
			return (
				<a href={this.props.pos} target="_blank">
					{this.props.pos}
				</a>
			);
		}
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
			return <span>{this.props.pos}</span>;
		}
		return (
			<a href={pos} onClick={open(pos)}>
				{pos}
			</a>
		);
	},
});

function open(pos, cb) {
	return function(e) {
		e.preventDefault();
		Fetch('open', { method: 'POST', body: pos });
		if (cb) {
			cb();
		}
	};
}

ReactDOM.render(
	<div style={{ fontFamily: 'sans-serif' }}>
		<Main />
	</div>,
	document.getElementById('main')
);
