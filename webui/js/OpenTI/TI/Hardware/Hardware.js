define(["./T6A04", "./Keyboard"], function(LCD, Keyboard) {
    var Hardware = function(cpu) {
        return {
            LCD: new LCD(cpu.devices[0x10].device),
            Keyboard: new Keyboard(cpu.devices[0x1].device)
        };
    }

    return Hardware;
});
