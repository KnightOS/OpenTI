define(["require", "../wrap", "../Core/CPU", "../Runloop", "./MMU", "../Debugger/Debugger"], function(require, Wrap, CPU, Runloop, MMU) {
    var ASIC = function(device) {
        pointer = Module["_asic_init"](device);

        this.pointer = pointer;

        Wrap.Int32(this, "stopped", pointer);
        pointer += 4;

        Wrap.Int32(this, "device", pointer);
        pointer += 4;

        Wrap.Int32(this, "battery", pointer);
        pointer += 4;

        Wrap.Int32(this, "battery_remove_check", pointer);
        pointer += 4;

        Object.defineProperty(this, "clock_rate", {
            get: (function() {
                return this.pointer + 16;
            }).bind(this),
            set: (function(val) {
                Module["_asic_set_clock_rate"](this.pointer, val);
            }).bind(this)
        });

        pointer += 4;

        Wrap.Pointer(this, "cpu", pointer, CPU);
        pointer += 4;

        Wrap.Pointer(this, "runloop", pointer, Runloop);
        pointer += 4;

        Wrap.Pointer(this, "mmu", pointer, MMU);
        pointer += 20;

        Wrap.Pointer(this, "debugger", pointer, require("../Debugger/Debugger"));
        pointer += 4;

    }

    ASIC.prototype.free = function() {
        Module["_asic_free"](this.pointer);
    }

    return ASIC;
});

