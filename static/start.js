start_TrendQuery();

function start_TrendQuery(redraw){
    setGlobalVars();

    if (num_charts !== undefined){
        window.num_charts = num_charts
    }

    if (redraw === undefined){
        window.redraw = false
    } else {
        window.redraw = redraw
    }

    draw_all_charts();

    clear_log();

    $(document).bind("contextmenu", function (event) {
        event.preventDefault();
    });

    set_document_and_menu_interactions();

    set_sketch()
}

