define(function(require) {
    return {
        Core: {
            CPU: require("OpenTI/Core/CPU"),
            Registers: require("OpenTI/Core/Registers"),
        },
        Debugger: {
            HookInfo: require("OpenTI/Debugger/HookInfo"),
        },
        TI: {
            ASIC: require("OpenTI/TI/ASIC"),
            DeviceType: require("OpenTI/TI/DeviceType"),
        },
        Runloop: require("OpenTI/Runloop")
    };
});
