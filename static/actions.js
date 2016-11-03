// This is a hack since I cant figure out how to get svg clicks and therefore we cannot avail of stoppropagation.
// So I am considering both conditions where line is clicked first or chart is clicked first and not doing anything in those
//cases since that means we are clicking both the line and chart

function svg_index_from_event(event) {
    const div_id = event.currentTarget.id; // TODO This is a hack. There should be cleaner way. Say to get div id from event
    return +div_id.substr(4);
}

function get_clicked_svg(event) {
    const div_index = svg_index_from_event(event);
    return svgs[div_index];
}

function move_action(title, svg_from, svg_to, should_log, update_log_and_recs){
    const lines = move(title, svg_from, svg_to);
    const move_query = create_move_query(title, index_of_svg(svg_from), index_of_svg(svg_to));
    //move_constraint(move_query)
    redraw_lines_and_reload(svg_to, lines, move_query, should_log, update_log_and_recs);
}

function move(title, svg_from, svg_to){
    if (svg_from === svg_to){
        return null;
    }
    const path = find_path(title);
    const lines_old = delete_title(title);
    redraw_lines_and_reload(svg_from, lines_old, "", false);
    return add_line_to_svg(path.__data__, svg_to);
}

function reset_legend(svg) {
    if (svg_legend.get(svg) != undefined) {
        svg_legend.get(svg).remove();
    }
    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(15,20)")
        .style("font-size", "12px")
        .call(d3.legend);
    svg_legend.set(svg, legend);
}

function split_action(name, should_log) {
    const index = index_from_title(name);
    const svg = svg_from_title(name);
    const cities = split_name(name);
    if (cities === null){
        return;
    }
    const split_query = create_split_query(name, index);
    //split_constraint(split_query)
    redraw_lines_and_reload(svg, cities, split_query, should_log)
}

function split_name(name) {
    for (var i = 0; i < available_groups.length; i++) {
        if (available_groups[i][0].name === name) {
            const data1 = available_groups[i][1];
            const data2 = available_groups[i][2];
            try_to_move_to_available_from_unavailable(data1);
            try_to_move_to_available_from_unavailable(data2);

            const after_delete = delete_line(available_groups[i][0]);
            available_groups.splice(i,1);

            const after_first = add_line_to_lines(data1, after_delete);
            return add_line_to_lines(data2, after_first)
        }
    }
    console.log(name + " could not be split");
    return null
}

// The line might itself be a group. If it is a group then move it otherwise do nothing
function try_to_move_to_available_from_unavailable(possible_group) {
    for (var i = 0; i < unavailable_groups.length; i++) {
        if (possible_group.name === unavailable_groups[i][0].name) {
            available_groups.push(unavailable_groups[i]);
            unavailable_groups.splice(i,1);
            return
        }
    }
}

function delete_line(line_to_delete, save_delete) {
    if (save_delete === undefined){
        save_delete = false
    }
    for (var i = 0; i < svgs.length; i++) {
        var lines = lines_in_svg(svgs[i]);
        for (var j = 0; j < lines.length; j++) {
            var line = lines[j];
            if (line.name === line_to_delete.name) {
                const delete_line = lines.splice(j, 1);
                if (save_delete){
                    del_title_line[line.name] = delete_line[0]
                }
                return lines;
            }
        }
    }
    console.log("No matching line found for ", line_to_delete.name);
    return null
}

function add_line_to_lines(line, lines){
    lines.push(line);
    return lines
}

function group_action(trend_name1, trend_name2, should_log, update_log_and_recs){
    const svg = svg_from_title(trend_name1);
    const group_query = create_group_query(trend_name1, trend_name2, index_from_title(trend_name1));
    group_constraint(group_query);
    const cities = group(trend_name1, trend_name2);
    redraw_lines_and_reload(svg, cities, group_query, should_log, update_log_and_recs);
}

function index_of_svg(svg){
    for (var i = 0; i < svgs.length; i++){
        if (svgs[i] === svg){
            return i
        }
    }
    console.log(new Error().stack);
}

function group(trend_name1, trend_name2) {
    if(trend_name1 === trend_name2){
        return null;
    }
    var path1, path2, svg;
    try {
        path1 = find_path(trend_name1);
        path2 = find_path(trend_name2);
        svg = svg_from_title(trend_name1)
    }
    catch(e){
        console.log("group ", trend_name1, trend_name2, "action failed");
        console.log(e.stack);
        throw e
    }

    return group_paths();

    function group_paths() {
        const with_combined = make_grouped_path_in_svg(path1.__data__,
            path2.__data__);
        const first_delete = delete_line_given_cities(path1.__data__, with_combined);
        return delete_line_given_cities(path2.__data__, first_delete)
    }

    function make_grouped_path_in_svg(data1, data2) {
        var values = [];
        for (var i = 0; i < data1.values.length; i++) {
            values[i] = {
                year: data1.values[i].year,
                count: (data1.values[i].count +
                data2.values[i].count) / 2
            };
        }
        const name = data1.name + "_" + data2.name;
        var data = {values: values, name: name};
        sim[name] = similarity_from_title(data1.name, data2.name);
        modify_availabilities_on_group_action(data, data1, data2);
        return add_line_to_svg(data, svg);
    }
}

function delete_line_given_cities(line, cities) {
    for (var j = 0; j < cities.length; j++) {
        if (cities[j].name === line.name) {
            cities.splice(j, 1);
            return cities;
        }
    }
    console.log("No matching line found for ", line.name);
    return null
}

function add_line_to_svg(data, svg) {
    var lines = lines_in_svg(svg);
    return add_line_to_lines(data, lines)
}

function lines_in_svg(svg){
    return find_all_paths_in_svg(svg).map(function(p){
        return p.__data__
    })
}

function modify_availabilities_on_group_action(grouped_data, data1, data2) {
    try_to_move_to_unavailable_from_available(data1);
    try_to_move_to_unavailable_from_available(data2);
    available_groups.push([grouped_data, data1, data2])
}

function try_to_move_to_unavailable_from_available(data) {
    for (var i = 0; i < available_groups.length; i++){
        if (data.name === available_groups[i][0].name) {
            unavailable_groups.push(available_groups[i]);
            available_groups.splice(i,1);
            return
        }
    }
}

function delete_action(title, should_log, update_log_and_recs){
    const svg = svg_from_title(title);
    const delete_query = create_delete_query(title, index_from_title(title));
    delete_constraint(delete_query);
    const cities = delete_title(title, true);
    redraw_lines_and_reload(svg, cities, delete_query, should_log, update_log_and_recs)
}

function possibly_update_log_and_recommender(update_log_and_recs, query, should_log) {
    if (update_log_and_recs || (update_log_and_recs === undefined)) {
        reload_log(query, should_log);
        reload_recommender();
    } else {
        add_to_timeline(should_log, query);
    }
}

function redraw_lines_and_reload(svg, cities, query, should_log, update_log_and_recs) {
    draw_lines(svg, cities);
    possibly_update_log_and_recommender(update_log_and_recs, query, should_log);
}

function reload_recommender() {
    function clear_recommender(){
        for (var i = 0; i < num_of_recs(); i++) {
            $("#rec" + i).empty();
        }
    }
    clear_recommender();
    load_recommender();
}

function delete_title(title, save_del) {
    const path = find_path(title);
    return delete_line(path.__data__, save_del)
}

function find_path(title) {
    var svg = svg_from_title(title);
    if (svg === undefined){
        console.log("svg undefined for", title, "num svgs", svgs.length)
    }
    var paths = find_all_paths_in_svg(svg);
    for (var j = 0; j < paths.length; j++) {
        var path = paths[j];
        if (path.__data__.name == title) {
            return path;
        }
    }
    console.log("Didnt find " + title);
    var e = new Error();
    console.log(e.stack);
}

function find_all_paths_in_svg(svg) {
    return svg.selectAll(".line")[0];
}