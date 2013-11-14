window.openti.mmu = function(flashPages, ramPages) {
    var self = this;
    self.flashUnlocked = false;
    self.flash = [];
    self.ram = [];
    self.banks = [
        { flash: true, page: 0 },
        { flash: true, page: 0 },
        { flash: true, page: 0 },
        { flash: false, page: 0 }
    ];

    for (var i = 0; i < flashPages * 0x4000; i++) {
        self.flash[i] = 0xFF;
    }
    for (var i = 0; i < ramPages * 0x4000; i++) {
        self.ram[i] = 0;
    }

    self.readMemory = function(address) {
        address &= 0xFFFF;
        var bank = self.banks[address / 0x4000];
        var mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
        if (bank.flash) {
            return self.flash[mappedAddress];
        } else {
            return self.ram[mappedAddress];
        }
    };

    self.writeMemory = function(address, value) {
        value &= 0xFF;
        address &= 0xFFFF;
        var bank = self.banks[address / 0x4000];
        var mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
        if (bank.flash) {
            // TODO: Flash stuff
        } else {
            self.ram[mappedAddress] = value;
        }
    };
};
