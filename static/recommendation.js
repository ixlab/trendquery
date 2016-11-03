/**
 * Created by kamat on 5/26/16.
 */
function create_menu_and_options(menu_ul, query_div, options,
                                 should_update) {
    function empty_menu() {
        var btn_group = document.createElement("div");
        btn_group.className = "btn-group";
        btn_group.setAttribute("title", "Click me for options");
        query_div.appendChild(btn_group);

        var button = document.createElement("button");
        button.setAttribute("type", "button");
        button.setAttribute("class", "btn btn-default dropdown-toggle");
        button.setAttribute("data-toggle", "dropdown");

        var selection_span = document.createElement("span");
        selection_span.setAttribute("class", "selection");
        selection_span.innerHTML = "Default";

        button.appendChild(selection_span);
        btn_group.appendChild(button);

        var ul = document.createElement("ul");
        ul.setAttribute("class", "dropdown-menu");
        ul.setAttribute("id", menu_ul);
        ul.setAttribute("role", "menu");
        btn_group.appendChild(ul);

        return selection_span; //TODO refactor return menu
    }

    function add_options() {
        selection_span.innerHTML = options[0];
        var ul = document.getElementById(menu_ul);
        for (var i = 0; i < options.length; i++) {
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.innerHTML = options[i];
            li.appendChild(a);
            ul.appendChild(li);
            $(a).click(function () {
                $(this).parents(".btn-group").find('.selection').text($(this).text());
                $(this).parents(".btn-group").find('.selection').val($(this).text());

                if (this.innerHTML.includes("subplot")){
                    if (should_update) {
                        update_query(query_div, $(this).text())
                    }
                }
            });
        }
    }

    var selection_span = empty_menu(menu_ul, query_div);
    add_options(menu_ul, options, selection_span, query_div, should_update);
}

//TODO Check with parameterized queries
// A change earlier in the recommendation should update the rest of the query
function update_query(query_div, svg_name) {
    var svg_index = index_from_subplot_name(svg_name);
    var query = make_query(query_div);
    var tokens = query.trim().match(/\S+/g);

    function update_delete() {

        var delete_titles = outliers(svg_index, get_titles_for_svg(svg_index).length);
        var subplots = subplot_list_with_input_as_first(svg_index);
        query_recommendation(query_div, ["DELETE FROM SUBPLOT ", subplots,
            "TREND", delete_titles])
    }

    //TODO Improve
    function update_group(){
        var group_titles = get_titles_for_svg(svg_index);
        var subplots = subplot_list_with_input_as_first(svg_index); // TODO Check
        query_recommendation(query_div, ["GROUP FROM SUBPLOT ", subplots, "TREND", group_titles,
            "TREND", group_titles])
    }

    function update_split(){
        query_recommendation(query_div, split_in_subplot_query(svg_index))
    }

    function update_move(){
        query_recommendation(query_div, ["MOVE FROM SUBPLOT" ,
            subplot_list_with_input_as_first(svg_index) , "TREND" ,
            get_titles_for_svg(svg_index), "TO", all_subplots()])
    }

    $('#rec' + index_of_rec_div(query_div)).empty();
    switch (tokens[0].toLowerCase()) {
        case "delete":
            update_delete();
            break;
        case "group":
            update_group();
            break;
        case "split":
            update_split();
            break;
        case "move":
            update_move();
            break;
        default:
            console.log("Could not match for ", query)
    }
}

function subplot_list_with_input_as_first(svg_index) {
    var subplots = ["subplot" + svg_index];
    for (var i = 0; i < svgs.length; i++) {
        if (i !== svg_index) {
            subplots.push("subplot" + i);
        }
    }
    return subplots;
}

function all_subplots(){
    var subplots = [];
    for (var i = 0; i < svgs.length; i++){
        subplots.push("subplot" + i)
    }
    return subplots
}

function query_recommendation(query_div, query_input) {

    function append_text_to_query_div(text) {
        var text_span = document.createElement("span");
        text_span.setAttribute("class", "query_text");
        text_span.innerHTML = text;
        query_div.appendChild(text_span);
    }

    function create_run_button(query_index){
        var button = document.createElement("button");
        button.setAttribute("class", "Run");
        button.setAttribute("id", "run" + query_index);

        var run_img = document.createElement("img");
        run_img.setAttribute("class", "selection");
        run_img.setAttribute("src", "play.png");
        run_img.setAttribute("title", "Click me to run the query");
        button.appendChild(run_img);

        query_div.appendChild(button);
        $('#run' + query_index).on('click', function(){
            run_query(make_query(query_div))
        })
    }

    create_run_button(index_of_rec_div(query_div));
    for (var i = 0; i < query_input.length; i++) {
        if (query_input[i].constructor == Array) { // Menu
            var ul_name = "drop_down_ul" + ul_index;
            ul_index++;
            const should_update =
                !(query_input[0].toLowerCase().includes("move"))
                || (i !== 5);
            create_menu_and_options(ul_name, query_div, query_input[i],
                should_update)
        } else {
            append_text_to_query_div(query_input[i])
        }
    }
}

function make_query(query_div){
    var query = "";
    const parts = $(query_div).children();
    for (var i = 0; i < parts.length; i++){
        var query_part = parts[i];
        if (query_part.className === "query_text"){
            query += " " + query_part.innerHTML +" "
        } else if (query_part.className === "btn-group"){
            query += " " + query_part.firstChild.firstChild.innerHTML +" "
        }
    }
    return query
}

function run_query_button_click() {
    var text_box = document.getElementById('TEXTBOX_ID');
    run_query(text_box.value)
}

function available_group_names() {
    var names = [];
    for (var i = 0; i < available_groups.length; i++) {
        names.push(available_groups[i][0].name)
    }
    return names
}

function split_in_subplot_query(subplotIndex){
    return ["SPLIT FROM SUBPLOT ", subplot_list_with_input_as_first(subplotIndex), "TREND",
        available_group_names_in_subplot(subplotIndex)]
}

function available_group_names_in_subplot(subplot_index){
    var available_groups = available_group_names();
    var groups_in_subplot = [];
    for (var i = 0; i < available_groups.length; i++){
        if (index_from_title(available_groups[i]) === subplot_index){
            groups_in_subplot.push(available_groups[i])
        }
    }
    return groups_in_subplot
}

function get_titles_for_svg(svg_index) {
    var svg = svgs[svg_index];
    var paths = find_all_paths_in_svg(svg);
    return paths.map(function (path) {
        return path.__data__.name
    })
}

function index_of_rec_div(query_div){
    return get_all_recs_divs().indexOf(query_div)
}

function get_all_recs_divs(){
    var all_queries_divs = [];
    for (var i = 0; i < num_of_recs(); i++){
        all_queries_divs.push(document.getElementById("rec" + i));
    }
    return all_queries_divs
}
