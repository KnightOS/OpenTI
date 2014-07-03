var OpenTI = (function() {
	var Wrap = {};
	var ShouldWrap = {
		Int32: ["HEAP32", 4],
		UInt32: ["HEAPU32", 4],
		Int16: ["HEAP16", 2],
		UInt16: ["HEAPU16", 2],
		Int8: ["HEAP8", 1],
		UInt8: ["HEAPU8", 1]
	}
	for(var i in ShouldWrap) {
		var Heap = Module[ShouldWrap[i][0]];
		var Divisor = ShouldWrap[i][1];

		Wrap[i] = function(obj, name, location, bit, offset) {
			location /= Divisor;

			console.log("Wrapping on", obj, "name", name, "at mem location", location * Divisor);
			console.log("Divided by", Divisor, "gets", location);

			if (bit == undefined) {
				bit = ~0;
				offset = 0;
			}

			Object.defineProperty(obj, name, {
				get: function() {
					return (Heap[location] & bit) >> offset;
				},
				set: function(val) {
					if (bit != ~0)
						Heap[location] &= ~bit;
					Heap[location] |= (val << offset) & bit;
				}
			});
		}
	}

	function dereferencePointer(pointer) {
		return Module.HEAPU32[pointer / 4];
	}

	function CPU() {
		if(arguments.length != 0)
			return this;

		this.initWithInternalPointer(Module._cpu_init());
	}

	CPU.fromPointer = function(pointer) {
		var cpu = new CPU(false);
		cpu.initWithInternalPointer(pointer);
		return cpu;
	}

	CPU.prototype.toPointer = function() {
		return this.internalPointer;
	}

	CPU.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;

		for(var i = 0; i < 0x100; i++) {

		}

		this.registers = CPU.Registers.fromPointer(int_point + 3072);

		Wrap.UInt8(this, "IFF1", int_point + 3076, 1, 0);
		Wrap.UInt8(this, "IFF2", int_point + 3076, 2, 1);
		Wrap.UInt8(this, "int_mode", int_point + 3076, 12, 2);
		Wrap.UInt8(this, "IFF_wait", int_point + 3076, 16, 4);
		Wrap.UInt8(this, "halted", int_point + 3076, 32, 5);
		Wrap.UInt8(this, "INT_pending", int_point + 3076, 64, 6);

		Wrap.UInt8(this, "bus", int_point + 3077);
		Wrap.UInt8(this, "prefix", int_point + 3078);

		this.memory = dereferencePointer(int_point + 3079);
	}

	CPU.Registers = function(pointer) {
		if (pointer != undefined)
			this.initWithInternalPointer(pointer);

		return this;
	}

	CPU.Registers.fromPointer = function(pointer) {
		return new CPU.Registers(pointer);
	}

	CPU.Registers.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;
	}

	function MMU(type) {
		if (type === undefined)
			return this;

		this.initWithInternalPointer(Module._ti_mmu_init(type));
		return this;
	}

	MMU.fromPointer = function(pointer) {
		var mmu = new MMU();
		mmu.initWithInternalPointer(pointer);
		return mmu;
	}

	MMU.prototype.toPointer = function() {
		return this.internalPointer;
	}

	MMU.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;

		this.settings = MMU.Settings.fromPointer(dereferencePointer(int_point));
		this.banks = [
			MMU.Bank.fromPointer(int_point + 4),
			MMU.Bank.fromPointer(int_point + 12),
			MMU.Bank.fromPointer(int_point + 20),
			MMU.Bank.fromPointer(int_point + 28)];
		this.ram = new Uint8Array(Module.HEAPU8, Module.HEAP32[int_point + 36]);
		this.flash = new Uint8Array(Module.HEAPU8, Module.HEAP32[int_point + 40]);
		Wrap.Int32(this, "flash_unlocked", int_point + 44);
	}

	MMU.Bank = function(internal_pointer) {
		if (internal_pointer === undefined)
			return this;
		this.initWithInternalPointer(internal_pointer);
		return this;
	}

	MMU.Bank.fromPointer = function(pointer) {
		return new MMU.Bank(pointer);
	}

	MMU.Bank.prototype.toPointer = function() {
		return this.internalPointer;
	}

	MMU.Bank.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;
		Wrap.UInt8(this, "page", int_point);
		Wrap.Int32(this, "flash", int_point + 3);
	}

	MMU.Settings = function(internal_pointer) {
		if (internal_pointer === undefined)
			return this;
		this.initWithInternalPointer(internal_pointer);
		return this;
	}

	MMU.Settings.fromPointer = function(pointer) {
		var mmu = new MMU.Settings();
		mmu.initWithInternalPointer(pointer);
		return mmu;
	}

	MMU.Settings.prototype.toPointer = function() {
		return this.internalPointer;
	}

	MMU.Settings.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;
		Wrap.UInt16(this, "ramPages", int_point);
		Wrap.UInt16(this, "flashPages", int_point + 2);
	}
	
	function Asic(type) {
		if (type === undefined)
			return this;
	
		this.initWithInternalPointer(Module._asic_init(type));
		return this;
	}

	Asic.fromPointer = function(pointer) {
		var asic = new Asic();
		asic.initWithInternalPointer(pointer);

		return asic;
	}

	Asic.prototype.toPointer = function() {
		return this.internalPointer;
	}

	Asic.prototype.initWithInternalPointer = function(internal_p) {
		this.internalPointer = internal_p;
		this.cpu = CPU.fromPointer(dereferencePointer(internal_p));
		Wrap.Int32(this, "device", internal_p + 4);
		this.mmu = MMU.fromPointer(dereferencePointer(internal_p + 8));
		Wrap.Int32(this, "battery", internal_p + 12);
		Wrap.Int32(this, "battery_remove_check", internal_p + 16);
	}

	var OpenTI = {
		deviceType: {
			TI73: 0,
			TI83p: 1,
			TI83pSE: 2,
			TI84p: 3,
			TI84pSE: 4,
			TI84pCSE: 5
		},
		batteryState: {
			removed: 0,
			low: 1,
			good: 2
		},
		ti: {
			Asic: Asic,
			MMU: MMU
		}
	}

	return OpenTI;
})()

if (module != undefined) {
	module.exports = OpenTI;
}
