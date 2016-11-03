//http://stackoverflow.com/questions/4495626/making-custom-right-click-context-menus-for-my-web-app

function show_menu(event, titles){
    window.selected_titles = titles;
    window.svg_idx = index_from_title(titles[0]);
    window.mainY = event.pageY;
    window.mainX = event.pageX;
    $(".custom-menu.main").finish().toggle(100).
        css({
            top: mainY + "px",
            left: mainX + "px"
        })
}

function show_move_menu(event){
    function remove_current_subplot_from_move_options(){
        const index = index_from_title(selected_titles[0]);
        window.append_option_again = index;
        $('li[data-action=subplot' + index + ' ]').remove();
    }
    remove_current_subplot_from_move_options(event);

    const menu_width = document.getElementsByClassName("custom-menu main")[0].clientWidth;
    const li_height = document.getElementsByClassName("custom-menu main")[0].clientHeight * 2/3;
    $(".custom-menu.move").finish().toggle(100).
        css({
            top: (mainY + li_height) + "px",
            left: (mainX + menu_width) + "px"
        })
}

function group_titles_in_box() {
    if (selected_titles.length > 1) {
        const index = index_from_title(selected_titles[0]);
        group_action(selected_titles[0], selected_titles[1], true, false);
        var name = selected_titles[0] + "_" + selected_titles[1];
        for (var i = 2; i < selected_titles.length; i++) {
            var new_title = selected_titles[i];
            group_with_timeout(name, new_title, index, true, false);
            name += "_" + selected_titles[i]
        }
        update_log_rec_ui()
    }
}

// TODO Search patterns for settimeout
function group_with_timeout(name, new_title, index, should_log, update_log_and_recs){
    var is_present = is_title_in_svg(name, index);
    if (is_present) {
        group_action(name, new_title, should_log, update_log_and_recs)
    } else {
        setTimeout(function(){
            group_with_timeout(name, new_title, index, should_log, update_log_and_recs)
     }, 10)
    }
}

function set_document_and_menu_interactions(){

    //$(document).bind("mousedown", function (e) {
    //$(document).unbind().mousedown(function (e) {
    // If the document is clicked somewhere
    $(document).mousedown(function (e) {
        if (append_option_again !== null){
            add_move_menu_option(append_option_again);
            window.append_option_again = null
        }

        if (!$(e.target).parents(".custom-menu").length > 0) {
            $(".custom-menu").hide(100);
            if (selected_titles !== null){
                for (var i = 0; i < selected_titles.length; i++){
                    undash(selected_titles[i])
                }
                window.selected_titles = null
            }
        }
    });

// If the main menu element is clicked
    $(".custom-menu.main li").unbind().click(function(e){
//    $(".custom-menu.main li").one('click', function(e){
//        console.log($(this).attr("data-action"))
        // This is the triggered action name
        switch($(this).attr("data-action")) {
            // A case for each action. Your actions here
            case "delete":
                for (var i = 0; i < selected_titles.length; i++){
                    delete_action(selected_titles[i], true, false)
                }
                update_log_rec_ui();
                window.selected_titles = null;
                $(".custom-menu.main").hide(100);
                break;
            case "group":
                group_titles_in_box();
                window.selected_titles = null;
                $(".custom-menu.main").hide(100);
                break;
            case "move":
                show_move_menu(e);
                break;
        }
    });
}

function is_title_in_svg(title, index){
    return get_titles_for_svg(index).indexOf(title) !== -1;

}
