define(["require", "../../wrap", "../../TI/ASIC", "../../Debugger/HookInfo"], function(require, Wrap) {
    var LCD = function(pointer) {
        if (!pointer) {
            throw "This item can only be called with a pointer!";
        }
        this.pointer = pointer;

        Wrap.UInt8(this, "up", pointer, 1, 0);
        Wrap.UInt8(this, "counter", pointer, 2, 1);
        Wrap.UInt8(this, "word_length", pointer, 4, 2);
        Wrap.UInt8(this, "display_on", pointer, 8, 3);
        Wrap.UInt8(this, "op_amp1", pointer, 48, 4);
        Wrap.UInt8(this, "op_amp2", pointer, 192, 6);
        pointer += 4;

        Wrap.Int32(this, "X", pointer);
        pointer += 4;
        Wrap.Int32(this, "Y", pointer);
        pointer += 4;
        Wrap.Int32(this, "Z", pointer);
        pointer += 4;

        Wrap.UInt8(this, "contrast", pointer);
        pointer += 4;

        Wrap.Int32(this, "ram_pointer", pointer);
        pointer += 4;

        Wrap.Pointer(this, "hook", pointer, require("../../Debugger/HookInfo"));
        pointer += 4;

        Wrap.Pointer(this, "asic", pointer, require("../../TI/ASIC"));
        pointer += 4;
    }

    LCD.prototype.readScreen = function(Y, X) {
        return Module["_bw_lcd_read_screen"](this.pointer, Y, X);
    }

    LCD.prototype.writeScreen = function(Y, X, val) {
        return Module["_bw_lcd_write_screen"](this.pointer, Y, X, val);
    }

    LCD.prototype.reset = function() {
        Module["_bw_lcd_reset"](this.pointer);
    }

    return LCD;
});
