var OpenTI;

var openti_log = {
    print: function(str) {
        $("#log pre").text($("#log pre").text() + str);
    },
    clear: function() {
        $("#log pre").text("");
    }
};

var openti_debug = {
    print: function(str) {
        $("#debugger pre").text($("#debugger pre").text() + str);
    },
    clear: function() {
        $("#debugger pre").text("");
    }
};

$(function() {
    $(".panel").each(function(a) {
        if ($(a).hasClass("collapsed")) {
            $(".panel-title", a).append($('<span class="glyphicon glyphicon-chevron-down pull-right"></span>'));
        } else {
            $(".panel-title", a).append($('<span class="glyphicon glyphicon-chevron-up pull-right"></span>'));
        }
        $(".panel-heading", a).click(function() {
            $("span", this).toggleClass("glyphicon-chevron-up").toggleClass("glyphicon-chevron-down");
            $(this).parent().toggleClass("collapsed");
        });
    });

    $("#debugger input").keypress(function (e) {
        if (e.which == 13) {
            var old_val = $(this).val();
            exec(old_val);
            $(this).val("");
            if (old_val.length != 0) {
                $(this).attr("placeholder", old_val);
            }
            return false;
        }
    });
});

var exec;

require(["OpenTI/OpenTI"], function(oti) {
    OpenTI = oti;

    var asic = new oti.TI.ASIC(oti.TI.DeviceType.TI84pSE);
    asic.debugger = new oti.Debugger.Debugger(asic);

    var prev_command = "";
    exec = function(str) {
        openti_debug.print("z80e > "+str+"\n");

        if (str.length == 0) {
            str = prev_command;
        }
        prev_command = str;

        var state = new oti.Debugger.Debugger.State(asic.debugger,
            {
                print: function(str) { openti_debug.print(str); },
                new_state: function() { return this; },
                closed: function() { }
            });

        state.exec(str);
    }

    openti_log.print("OpenTI loaded!\n");
});
