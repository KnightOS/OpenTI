$(function() {
    $(".panel").each(function(a) {
        var span = $('<span>').addClass('glyphicon pull-right');
        if ($(a).hasClass("collapsed")) {
            span.addClass('glyphicon-chevron-down');
        }else{
            span.addClass('glyphicon-chevron-up');
        }
        $(".panel-title",a).append(span);
        $(".panel-heading",a).click(function() {
            $("span",this)
                .toggleClass("glyphicon-chevron-up")
                .toggleClass("glyphicon-chevron-down");
            $(this)
                .parent()
                .toggleClass("collapsed");
        });
    });
});
