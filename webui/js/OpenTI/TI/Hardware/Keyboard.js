define(function() {
    var Keyboard = function(pointer) {
        if (!pointer) {
            throw "This object has to be instantiated with a pointer!";
        }
        this.pointer = pointer;
    }

    Keyboard.prototype.press = function(code) {
        Module["_depress_key"](this.pointer, code);
    }

    Keyboard.prototype.release = function(code) {
        Module["_release_key"](this.pointer, code);
    }

    return Keyboard;
});
