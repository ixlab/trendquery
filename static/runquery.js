function index_from_subplot_name(subplot){
    return +subplot.substr(7);
}

function run_query(query) {
    query = query.trim().toLowerCase();
    var tokens = query.match(/\S+/g);
    if (query.includes("where")){
        run_where(tokens, query);
    } else {
        //enterIntoQuery_Constraint(query)
        run_normal(tokens, query);
    }
}

function group_constraint(query) {
    var tokens = query.match(/\S+/g);
    var trend_name1 = tokens[5];
    var trend_name2 = tokens[7];
    query_constraint[format(query).replace(/\s+/g, " ").trim()] = [trend_name1, trend_name2, 1].join();
}

function delete_constraint(query) {
    var tokens = query.match(/\S+/g);
    var del_name = tokens[5];
    var others = get_titles_for_svg(plot_index(query)).filter(function (t) {
        return t !== del_name;
    });
    var t1_t2_class = others.map(function (t) {
        return [del_name, t, 0].join();
    });
    query_constraint[format(query).replace(/\s+/g, ' ').trim()] = t1_t2_class;
}

// TODO Use this. Not used for now
function move_constraint(query) {
    var tokens = query.match(/\S+/g);
    var move_name = tokens[5];
    var index_from = index_from_subplot_name(tokens[3]);
    var index_to = index_from_subplot_name(tokens[7]);

    var other_titles_from = get_titles_for_svg(index_from).filter(function (t) {
        return t !== move_name;
    });
    var t1_t2_class_from = other_titles_from.map(function (t) {
        return [move_name, t, 0].join();
    });
    query_constraint[format(query).replace(/\s+/g, " ").trim()] = t1_t2_class_from;

    var to_titles = get_titles_for_svg(index_to);
    var t1_t2_class_to = to_titles.map(function (t) {
        return [move_name, t, 1].join();
    });

    const combined = t1_t2_class_from.concat(t1_t2_class_to);
    query_constraint[format(query).replace(/\s+/g, " ").trim()] = combined;
}

// TODO Use it
function split_constraint(split_query) {
    var tokens = split_query.match(/\S+/g);
    const split_name = tokens[5];
    for (var query in query_constraint){
        if (query_constraint.hasOwnProperty(query)){
            var constraint = query_constraint[query];
            var possible_split_name = constraint[0] + "_" + constraint[1];
            if (possible_split_name === split_name){
                delete query_constraint[query];
                return;
            }
        }
    }
    console.log("No corresponding group query for", split_query)
}

function format(query){
    return query.toLowerCase().replace(/\s+/g," ").trim()
}

function run_where(tokens, query){
    switch (tokens[0].toLowerCase()) {
        case "delete":
            //Format: DELETE FROM SUBPLOT subplot0 TRENDS WHERE OUTLYING_RANK < 2
            var svg_index = index_from_subplot_name(tokens[3]);
            const number_of_outliers_to_delete = +tokens[8];
            return delete_where(svg_index, number_of_outliers_to_delete, query);
        case "group":
            // Format: Group from subplot s0 where similarity rank < 1
            svg_index = index_from_subplot_name(tokens[3]);
            const number_of_groups = +tokens[8];
            return group_where(svg_index, number_of_groups, query);
        case "split":
            //Format: Split from subplot s0 where similarity rank > 1. TODO Needs work
            //TODO Refactor
            svg_index = index_from_subplot_name(tokens[3]);
            const number_of_outliers_to_split = +tokens[8];
            return split_where(svg_index, number_of_outliers_to_split, query);
        case "move":
            //Format: Move from s0 to s1 where similarity rank < 3
            var index_from = index_from_subplot_name(tokens[2]);
            var index_to = index_from_subplot_name(tokens[4]);
            const number_of_trends_to_move = +tokens[9];
            const out = move_where(index_from, index_to, number_of_trends_to_move,
                query);
            return out;
        default:
            console.log("Could not match for ", tokens);
            return false
    }
}

function run_normal(tokens){
    switch (tokens[0].toLowerCase()) {
        case "delete":
            var trend_name = tokens[5];
            delete_action(trend_name);
            break;
        case "group":
            var trend_name1 = tokens[5];
            var trend_name2 = tokens[7];
            group_action(trend_name1, trend_name2);
            break;
        case "split":
            trend_name = tokens[5];
            split_action(trend_name);
            break;
        case "move":
            trend_name = tokens[5];
            var index_from = index_from_subplot_name(tokens[3]);
            var index_to = index_from_subplot_name(tokens[7]);
            var svg_from = svgs[index_from];
            var svg_to = svgs[index_to];
            move_action(trend_name, svg_from, svg_to);
            break;
        default:
            console.log("No query can be run for", tokens)
    }
}

function undo_query(query) {
    query = query.trim().toLowerCase();
    var tokens = query.match(/\S+/g);
    if (query.includes("where")){
        undo_where(query)
    } else {
        undo_normal(tokens)
    }
}

function undo_where(query){
    var sub_queries = getSubQueries(query);
    const sub_queries_in_run_order = sub_queries.reverse();
    for (var i = 0; i < sub_queries_in_run_order.length; i++){
        var sub_query = sub_queries_in_run_order[i].trim().toLowerCase();
        var tokens = sub_query.match(/\S+/g);
        undo_normal(tokens)
    }
}

function undo_normal(tokens){
    switch (tokens[0].toLowerCase()) {
        case "delete":
            var svg_index = index_from_subplot_name(tokens[3]);
            var trend_name = tokens[5];
            var data = del_title_line[trend_name];
            var lines = add_line_to_svg(data, svgs[svg_index]);
            redraw_lines_and_reload(svgs[svg_index], lines, "", false);
            delete del_title_line[trend_name];
            break;
        case "group":
            var trend_name1 = tokens[5];
            var trend_name2 = tokens[7];
            split_action(trend_name1 + "_" + trend_name2, false);//Dont log
            break;
        case "split":
            trend_name = tokens[5];
            var individual_names = trend_name.split("_");
            trend_name1 = individual_names[0];
            trend_name2 = individual_names[1];
            group_action(trend_name1, trend_name2, false);
            break;
        case "move":
            trend_name = tokens[5];
            var index_from = index_from_subplot_name(tokens[3]);
            var index_to = index_from_subplot_name(tokens[7]);
            var svg_from = svgs[index_from];
            var svg_to = svgs[index_to];
            move_action(trend_name, svg_to, svg_from, false);//Reverse the move. This is on purpose
            break;
        default:
            console.log("Could not undo query for tokens ", tokens)
    }
}

function delete_where(svg_index, number_of_outliers, query){
    const outlier_titles = outliers(svg_index, number_of_outliers);
    var sub_queries = [];
    for (var i = 0; i < outlier_titles.length; i++){
        sub_queries.push(create_delete_query(outlier_titles[i], svg_index));
        var lines = delete_title(outlier_titles[i], true)
    }
    save_sub_queries(query, sub_queries);
    redraw_lines_and_reload(svgs[svg_index], lines, query)
}

function create_delete_query(title, svgIndex){
    return "DELETE FROM SUBPLOT subplot" + svgIndex + " TREND " + title
}

function save_sub_queries(query, sub_queries){
    if (where_query_and_subQueries[query] === undefined){
        where_query_and_subQueries[query] = [sub_queries];
    } else { // I dont know why I am doing this else part
        var list_of_sub_queries = where_query_and_subQueries[query];
        list_of_sub_queries.push(sub_queries);
        where_query_and_subQueries[query] = list_of_sub_queries;
    }
}

function getSubQueries(query){
    var listOfSubQueries = where_query_and_subQueries[query];
    var subQueries = listOfSubQueries.pop();
    where_query_and_subQueries[query] = listOfSubQueries;
    return subQueries
}

function group_where(svg_index, number_of_outliers, query){
    function flatten_matrix(matrix){
        var flattened_list = [];
        for (var i = 0; i <matrix.length; i++){
            for (var j = 0; j <matrix.length; j++){
                flattened_list.push([matrix[i][j], i, j])
            }
        }
        return flattened_list
    }

    const rows_of_counts_and_titles = create_rows_of_counts_and_titles(svg_index);
    const similarity_matrix = self_similarities(rows_of_counts_and_titles[0]);
    const similarities_list = flatten_matrix(similarity_matrix);
    const sorted_similarities = similarities_list.sort(function(a, b){
        return a[0] <= b[0] ? 1 : -1
    });
    var lines_used_in_grouping = new Set();
    var group_count = 0;
    var sub_queries = [];
    for (var i = 0; i < sorted_similarities.length; i++){
        const title1 = rows_of_counts_and_titles[1][sorted_similarities[i][1]];
        const title2 = rows_of_counts_and_titles[1][sorted_similarities[i][2]];
        if ((!lines_used_in_grouping.has(title1)) &&
            (!lines_used_in_grouping.has(title2))){
            lines_used_in_grouping.add(title1);
            lines_used_in_grouping.add(title2);
            sub_queries.push(create_group_query(title1, title2, svg_index));
            var cities = group(title1, title2);
            group_count++;
            if (group_count === number_of_outliers){
                redraw_lines_and_reload(svgs[svg_index], cities, query);
                save_sub_queries(query, sub_queries);
                return
            }
        }
    }
}

function create_group_query(title1, title2, svg_index){
    return "GROUP FROM SUBPLOT subplot" + svg_index + " TREND " + title1
        + " TREND " + title2
}

function split_where(svg_index, number_of_outliers_to_delete, query){
    var split_candidates = [];
    for (var i = 0; i < available_groups.length; i++) {
        const group_name = available_groups[i][0].name;
        if (index_from_title(group_name) === svg_index) {
            split_candidates.push(available_groups[i])
        }
    }
    var sim_scores = split_candidates.map(function(candidate){
        return euclidean_similarity(counts_from_data(candidate[1]),
            counts_from_data(candidate[2]))
    });

    const indices = sort_with_indices_ascending_limit(sim_scores, number_of_outliers_to_delete);
    var cities = null;
    var sub_queries = [];
    for (i = 0; i < indices.length; i++){
        sub_queries.push(create_split_query(split_candidates[indices[i]][0].name, svg_index));
        cities = split_name(split_candidates[indices[i]][0].name)
    }
    save_sub_queries(query, sub_queries);
    redraw_lines_and_reload(svgs[svg_index], cities, query)
}

function counts_from_data(data){
    return data.values.map(function(count_year){
        return +count_year.count
    })
}

function create_split_query(title, svg_index){
    return "SPLIT FROM SUBPLOT subplot" + svg_index + " TREND " + title
}

function move_where(index_from, index_to, number_of_trends_to_move, query){
    // For each line in index_from find the average similarity with each
    // line in index_to. Choose the most similar ones
    const rows_of_counts_and_titles_from = create_rows_of_counts_and_titles(index_from);
    const rows_of_counts_and_titles_to = create_rows_of_counts_and_titles(index_to);
    var avg_sims = svg_avg_similarity(rows_of_counts_and_titles_from[0],
        rows_of_counts_and_titles_to[0]);
    const highest_avg_sim_indices = sort_with_indices_descending_limit(avg_sims,
        number_of_trends_to_move);
    var cities = null;
    var sub_queries = [];
    for (var i = 0; i < highest_avg_sim_indices.length; i++){
        sub_queries.push(create_move_query(rows_of_counts_and_titles_from[1][highest_avg_sim_indices[i]], index_from, index_to));
        cities =
            move(rows_of_counts_and_titles_from[1][highest_avg_sim_indices[i]],
                svgs[index_from], svgs[index_to])
    }
    save_sub_queries(query, sub_queries);
    redraw_lines_and_reload(svgs[index_to], cities, query)
}

function create_move_query(title, index_from, index_to){
    return "MOVE FROM SUBPLOT subplot" + index_from + " TREND " + title
        + " TO subplot" + index_to
}