define(['./Core/CPU', './Core/Registers', './Debugger/HookInfo', './Debugger/Debugger',
        './TI/ASIC', './TI/DeviceType', './TI/MMU', './TI/Hardware/Hardware', './Runloop'], 
    function(_cpu, _registers, _hookinfo, _debugger, _asic, _devicetype, _mmu, _hardware, _runloop) {
    return {
        Core: {
            CPU: _cpu,
            Registers: _registers,
        },
        Debugger: {
            HookInfo: _hookinfo,
            Debugger: _debugger,
        },
        TI: {
            ASIC: _asic,
            DeviceType: _devicetype,
            MMU: _mmu,
            Hardware: _hardware
        },
        Runloop: _runloop
    };
});
