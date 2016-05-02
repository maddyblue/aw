# aw

aw is a [Go](https://golang.org/) helper for
[acme](http://research.swtch.com/acme).

It watches the acme log for open `.go` windows and can run
[guru](https://godoc.org/golang.org/x/tools/cmd/guru) and other commands
at the point of the cursor. Output is shown in the browser.

## usage

- `go get github.com/mjibson/aw`
- Run `aw`, then open [http://localhost:6161](http://localhost:6161).

## motivation

There are Go plugins for all other popular text editors. The only one I
have found for acme is [acmego](https://godoc.org/9fans.net/go/acme/acmego)
which runs `gofmt` on save. I frequently want to see documentation, type,
and other information when I'm working. I could have written a script that
did this and printed the output to an acme window. But since I always have
a web browser open alongside acme, it made sense to me to use the brower
screen space for doc text (which is what it was used for anyways), instead of
opening new acme windows and using space I'd prefer to save for code files.

This project is an experiment about my editing environment. I may learn
enough about how to use acme well that this entire project gets scrapped
in favor of a smart script that does what I need.

## development

1. Install JavaScript dependencies: `npm install`.
2. Install [modd](http://github.com/cortesi/modd): `go get github.com/cortesi/modd`.
3. Run `modd` in the `aw` directory. This will watch and recompile Go and JS as needed.

To regenerate the static assets in `static.go`:

1. Install [esc](github.com/mjibson/esc): `go get github.com/mjibson/esc`.
2. Run `go generate` to recompile the static assets.
