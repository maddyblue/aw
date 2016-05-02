package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"unicode"

	"9fans.net/go/acme"
	"9fans.net/go/plan9"
	"9fans.net/go/plumb"
	"golang.org/x/net/websocket"
)

var (
	flagAddr = flag.String("listen", ":6161", "listen address")
	flagDev  = flag.Bool("dev", false, "enable dev mode")
)

func main() {
	flag.Parse()

	webFS := FS(*flagDev)
	http.Handle("/static/", http.FileServer(webFS))
	http.Handle("/ws", websocket.Handler(WS))
	http.HandleFunc("/", Index)
	http.HandleFunc("/api/open", wrap(Open))
	http.HandleFunc("/api/command", wrap(Command))
	fmt.Println("listening on", *flagAddr)
	log.Fatal(http.ListenAndServe(*flagAddr, nil))
}

func Index(w http.ResponseWriter, r *http.Request) {
	w.Write(FSMustByte(*flagDev, "/static/index.html"))
}

func wrap(f func(r *http.Request) (interface{}, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		res, err := f(r)
		if err != nil {
			log.Println(err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if res == nil {
			return
		}
		w.Header().Add("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(res); err != nil {
			log.Println(err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

func WS(ws *websocket.Conn) {
	defer ws.Close()
	wins := listWindows()
	if err := websocket.JSON.Send(ws, wins); err != nil {
		return
	}
	a, err := acme.Log()
	if err != nil {
		log.Println(err)
		return
	}
	defer a.Close()
Loop:
	for {
		r, err := a.Read()
		if err != nil {
			log.Println(err)
			return
		}
		switch r.Op {
		case "new", "del":
		default:
			continue Loop
		}
		wins := listWindows()
		if err := websocket.JSON.Send(ws, wins); err != nil {
			return
		}
	}
}

func listWindows() interface{} {
	ws, err := acme.Windows()
	if err != nil {
		log.Printf("acme list windows: %s", err)
		return nil
	}
	wins := make([]acme.WinInfo, 0, len(ws))
	for _, w := range ws {
		if !strings.HasSuffix(w.Name, ".go") {
			continue
		}
		wins = append(wins, w)
	}
	return struct {
		Windows []acme.WinInfo
	}{
		wins,
	}
}

func Open(r *http.Request) (interface{}, error) {
	b, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	port, err := plumb.Open("send", plan9.OWRITE)
	if err != nil {
		return nil, err
	}
	defer port.Close()
	msg := &plumb.Message{
		Dst:  "edit",
		Type: "text",
		Data: b,
	}
	return nil, msg.Send(port)
}

func Command(r *http.Request) (interface{}, error) {
	id := r.FormValue("id")
	command := r.FormValue("command")
	scope := r.FormValue("scope")
	wid, err := strconv.Atoi(id)
	if err != nil {
		return nil, err
	}
	pos, body, err := getWin(wid)
	if err != nil {
		return nil, err
	}
	modified := fmt.Sprintf("%s\n%d\n%s", pos.file, len(body), body)
	var bin string
	var args []string
	var hasLines bool
	switch command {
	case "docs":
		bin = "gogetdoc"
		args = []string{"-modified", "-pos", pos.String()}
	default:
		bin = "guru"
		args = []string{"-modified"}
		if scope != "" {
			args = append(args, "-scope", scope)
		}
		args = append(args, command, pos.String())
		hasLines = true
	}
	cmd := exec.Command(bin, args...)
	cmd.Stdin = strings.NewReader(modified)
	b, err := cmd.CombinedOutput()
	s := string(b)
	if err != nil {
		s = fmt.Sprintf("%s: %s", err, s)
	} else if !cmd.ProcessState.Success() {
		hasLines = false
	}
	pre, ctx, post := getContext(body, pos.q0)
	return struct {
		Pos     string
		Name    string
		Data    string
		Pre     string
		Context string
		Post    string
		Lines   bool
	}{
		pos.String(),
		command,
		s,
		pre, ctx, post,
		hasLines,
	}, nil
}

func getContext(b []byte, at int) (pre, ctx, post string) {
	left := bytes.LastIndexByte(b[:at], '\n')
	right := bytes.IndexByte(b[at:], '\n')
	const limit = 200
	if at-left > 200 {
		left = at - 200
	}
	if right > 200 {
		right = 200
	} else if right < 0 {
		right = 0
	}
	emphl := at
	for emphl >= left {
		if unicode.IsLetter(rune(b[emphl])) {
			emphl--
		} else {
			break
		}
	}
	emphr := at
	for emphr < at+right {
		if unicode.IsLetter(rune(b[emphr])) {
			emphr++
		} else {
			break
		}
	}
	if emphl == emphr {
		emphr++
	}
	if emphr > at+right {
		emphr = at + right
	}
	s := string(b)
	return s[left:emphl], s[emphl:emphr], s[emphr : at+right]
}

func getWin(id int) (Pos, []byte, error) {
	var p Pos
	w, err := acme.Open(id, nil)
	if err != nil {
		return p, nil, fmt.Errorf("open: %v: %s", id, err)
	}
	defer w.CloseFiles()
	_, _, err = w.ReadAddr() // make sure address file is already open.
	if err != nil {
		return p, nil, fmt.Errorf("read addr first: %s", err)
	}
	err = w.Ctl("addr=dot")
	if err != nil {
		return p, nil, fmt.Errorf("ctl addr dot: %s", err)
	}
	q0, q1, err := w.ReadAddr()
	if err != nil {
		return p, nil, fmt.Errorf("read addr: %s", err)
	}
	b, err := w.ReadAll("body")
	if err != nil {
		return p, nil, fmt.Errorf("read body: %s", err)
	}
	tagb, err := w.ReadAll("tag")
	if err != nil {
		return p, nil, fmt.Errorf("read tag: %s", err)
	}
	ts := strings.Fields(string(tagb))
	if len(ts) < 1 {
		return p, nil, fmt.Errorf("bad tag")
	}
	qp0 := runeOffset2ByteOffset(b, q0)
	qp1 := runeOffset2ByteOffset(b, q1)
	return Pos{
		file: ts[0],
		q0:   qp0,
		q1:   qp1,
	}, b, nil
}

type Pos struct {
	file   string
	q0, q1 int
}

func (p Pos) String() string {
	return fmt.Sprintf("%s:#%d", p.file, p.q0)
}

func runeOffset2ByteOffset(b []byte, off int) int {
	r := 0
	for i, _ := range string(b) {
		if r == off {
			return i
		}
		r++
	}
	return len(b)
}

//go:generate browserify -t [ babelify --presets [ react ] ] static/src/site.js -o static/js/site.js
//go:generate esc -o static.go -pkg main static/index.html static/js
