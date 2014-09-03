define(function() {
    var HookInfo = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated with a memory region predefined!";
        }

        this.pointer = pointer;
    }; // TODO

    HookInfo.sizeOf = function() {
        // TODO
        return -1;
    }

    return HookInfo;
});
