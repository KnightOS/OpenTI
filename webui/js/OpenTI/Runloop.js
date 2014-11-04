define(function() {
    var Runloop = function(pointer) {
        if (!pointer) {
            pointer = Module["_runloop_init"]();
        }

        this.pointer = pointer;
    }

    Runloop.prototype.tick = function(cycles) {
        if (!cycles) {
            return Module["_runloop_tick"](this.pointer);
        } else {
            return Module["_runloop_tick_cycles"](this.pointer, cycles);
        }
    }

    return Runloop;
});
