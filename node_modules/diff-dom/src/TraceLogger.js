/**
 * Use TraceLogger to figure out function calls inside
 * JS objects by wrapping an object with a TraceLogger
 * instance.
 *
 * Pretty-prints the call trace (using unicode box code)
 * when tracelogger.toString() is called.
 */

/**
 * Wrap an object by calling new TraceLogger(obj)
 *
 * If you're familiar with Python decorators, this
 * does roughly the same thing, adding pre/post
 * call hook logging calls so that you can see
 * what's going on.
 */
export class TraceLogger {
    constructor(obj = {}) {
        this.pad = "│   "
        this.padding = ""
        this.tick = 1
        this.messages = []
        const wrapkey = (obj, key) => {
            // trace this function
            const oldfn = obj[key]
            obj[key] = (...args) => {
                this.fin(key, Array.prototype.slice.call(args))
                const result = oldfn.apply(obj, args)
                this.fout(key, result)
                return result
            }
        }
        // can't use Object.keys for prototype walking
        for (let key in obj) {
            if (typeof obj[key] === "function") {
                wrapkey(obj, key)
            }
        }
        this.log("┌ TRACELOG START")
    }
    // called when entering a function
    fin(fn, args) {
        this.padding += this.pad
        this.log(`├─> entering ${fn}`, args)
    }
    // called when exiting a function
    fout(fn, result) {
        this.log("│<──┘ generated return value", result)
        this.padding = this.padding.substring(0, this.padding.length - this.pad.length)
    }
    // log message formatting
    format(s, tick) {
        let nf = function(t) {
            t = `${t}`
            while (t.length < 4) {
                t = `0${t}`
            }
            return t
        }
        return `${nf(tick)}> ${this.padding}${s}`
    }
    // log a trace message
    log() {
        let s = Array.prototype.slice.call(arguments)
        const stringCollapse = function(v) {
            if (!v) {
                return "<falsey>"
            }
            if (typeof v === "string") {
                return v
            }
            if (v instanceof HTMLElement) {
                return v.outerHTML || "<empty>"
            }
            if (v instanceof Array) {
                return `[${v.map(stringCollapse).join(",")}]`
            }
            return v.toString() || v.valueOf() || "<unknown>"
        }
        s = s.map(stringCollapse).join(", ")
        this.messages.push(this.format(s, this.tick++))
    }
    // turn the log into a structured string with
    // unicode box codes to make it a sensible trace.
    toString() {
        let cap = "×   "
        let terminator = "└───"
        while (terminator.length <= this.padding.length + this.pad.length) {
            terminator += cap
        }
        let _ = this.padding
        this.padding = ""
        terminator = this.format(terminator, this.tick)
        this.padding = _
        return `${this.messages.join("\n")}\n${terminator}`
    }
}
