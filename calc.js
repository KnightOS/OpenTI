/*
 * calc.js
 * Model-specific code and constructors for all available models
 */
window.openti.asic = function(clocks, usb) {
    var self = this;
    self.privledgedPages = [];
    self.cpu = new window.openti.z80();
    self.mmu = new window.openti.mmu(0x20, 3);
    self.cpu.readMemory = self.mmu.readMemory;
    self.cpu.writeMemory = self.mmu.writeMemory;

    self.hardware = [];
    for (var i = 0; i < 0x100; i++) {
        self.hardware[i] = {
            read: function(asic) { return -1; },
            write: function(asic, value) { },
            isProtected: false
        };
    }

    self.cpu.readPort = function(port) {
        return self.hardware[port].read(self);
    };
    self.cpu.writePort = function(port, value) {
        if (self.hardware[port].isProtected && !self.mmu.flashUnlocked)
            return;
        self.hardware[port].write(self, value);
    };

    return self;
};

window.TI83p = function() {
    var self = this;
    self.asic = openti.asic(false, false);
    self.asic.privledgedPages = [ 0x1C, 0x1D, 0x1F ];

    self.cpu = self.asic.cpu;
    self.mmu = self.asic.mmu;
    self.execute = self.cpu.execute;

    return self;
};
