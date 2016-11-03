/**
 * Created by kamat on 5/26/16.
 */
function individial_splits(){
    var groups = available_group_names();
    var groups_sim = groups.sort(function(a, b){
        return sim[b] - sim[a];
    });
    return groups_sim.map(function (g) {
        return ["SPLIT FROM SUBPLOT subplot" + index_from_title(g) + " TREND " + g];
    });
}

function individual_deletes(){
    var deletes = [];
    for (var i = 0; i < svgs.length; i++) {
        var subplot = "subplot" + i;
        var titles = outliers(i, 1);
        for (var t = 0; t < titles.length; t++){
            deletes.push(["DELETE FROM SUBPLOT " + subplot + " TREND " + titles[t]]);
        }
    }
    deletes.sort(function(a, b){
        return unified_score(top_of_query(b)) - unified_score(top_of_query(a));
    });
    return deletes.slice(0, 9)
}

// Get few outliers from each subplot.: Easy
// Test for each which is best move subplot. : Find median similarity
// Sort this: Easy
function individual_moves(){
    var moves = [];
    for (var i = 0; i < svgs.length; i++){
        const outlier_titles = outliers(i, 1);
        for (var ot = 0; ot < outlier_titles.length; ot++){
            var from_sim_to_title = [];
            //for (var j = 0; j < svgs.length; j++){
            for (var j = i + 1; j < i + 2 && j < svgs.length; j++){ // TODO Sampled for time
                from_sim_to_title.push([i, sim_of_line_with_plot(outlier_titles[ot], j), j, outlier_titles[ot]]);
            }
            if (from_sim_to_title.length > 0){
                from_sim_to_title.sort(function(a, b){
                    return b[1] - a[1]
                });
                moves.push(from_sim_to_title[0])
            }
        }
    }
    moves.sort(function(a, b){
        return b[1] - a[1]
    });
    return moves.map(function (t) {
        return [create_move_query(t[3], t[0], t[2])]
    })
}

function individual_groups(){
    function group_similarity(q){
        return similarity_from_title(get_token_at(5, q), get_token_at(7, q))
    }

    function enumerate_groups() {
        var groups = [];
        for (var i = 0; i < svgs.length; i++) {
            var subplot = "subplot" + i;
            var titles = get_titles_for_svg(i);
            //TODO Sampled For time constraints
            titles = titles.splice(0, 6);
            var groups_in_i = [];
            for (var t1 = 0; t1 < titles.length - 1; t1++) {
                //    for (var t2 = t1 + 1; t2 < titles.length; t2++) {
                //TODO Sampled For time constraints
                for (var t2 = t1 + 1; t2 < titles.length && t2 < t1 + 2; t2++) {
                    groups_in_i.push([create_group_query(titles[t1], titles[t2], i)])
                }
            }
            groups_in_i.sort(function(a, b){
                return group_similarity(top_of_query(b)) - group_similarity(top_of_query(a))
            });
            groups.push(groups_in_i.slice(0, 2))
        }
        return groups;
    }

    function flatten(g){
        var f = g[0];
        for (var i = 1; i < g.length; i++){
            f = f.concat(g[i])
        }
        return f
    }

    function top_of_groups(gs){
        var tops = [];
        for (var i = 0; i < gs.length; i++){
            tops.push(gs[i].map(top_of_query))
        }
        return tops;
    }

    var groups = enumerate_groups();
    var group_tops = top_of_groups(groups);
    var flattened = flatten(groups);

    return [group_tops, flattened]
}

function load_recommender(){
    const queries = all_recommendations();
    create_recs_divs(queries.length);
    all_queries_recs(get_all_recs_divs());

    function all_queries_recs(divs_of_all_recs){
        for (var i = 0; i < queries.length; i++){
            query_recommendation(divs_of_all_recs[i], queries[i]);
        }
    }
}

function create_recs_divs(num_recs){
    for (var i = 0; i < num_recs; i++){
        var rec = document.createElement("div");
        rec.setAttribute("class", "rec");
        rec.setAttribute("id", "rec" + i);
        $("#actual_recs").append(rec)
    }
}

function all_recommendations() {
    var all_recs = [];

    const deletes = individual_deletes();
    all_recs = all_recs.concat(deletes);

    const groups = individual_groups();
    const group_tops = groups[0];
    const flattened = groups[1];
    all_recs = all_recs.concat(flattened);

    const splits = individial_splits();
    all_recs = all_recs.concat(splits);
    const split_tops = splits.map(top_of_query);

    const moves = individual_moves();
    const move_tops = moves.map(top_of_query);
    all_recs = all_recs.concat(moves);

    all_recs.sort(function(a, b){
        return unified_score(top_of_query(b), group_tops, split_tops, move_tops) - unified_score(top_of_query(a), group_tops, split_tops, move_tops)
    });

    //const sliced = all_recs.slice(0, 15)
    const sliced = all_recs;
    return parameterize(sliced)
}

function parameterize(queries){
    var ps = [];
    for (var i = 0; i < queries.length; i++){
        switch (get_type(queries[i])){
            case "delete":
                ps.push(parameterize_delete(queries[i][0]));
                break;
            case "group":
                ps.push(parameterize_group(queries[i][0]));
                break;
            case "split":
                ps.push(parameterize_split(queries[i][0]));
                break;
            case "move":
                ps.push(parameterize_move(queries[i][0]));
                break;
            default:
                console.log("goodness Could not match for ", queries[i])
        }
    }
    return ps
}

function parameterize_delete(query){
    const i = plot_index(query);
    const del = get_token_at(5, query);
    var options = outliers_given_top_outlier(i, del);
    return ["DELETE FROM SUBPLOT ", subplot_list_with_input_as_first(i), "TREND", options ]
}

function outliers_given_top_outlier(i, del) {
    const outs = outliers(i, get_titles_for_svg(i).length);
    var options = [del];
    options = options.concat(outs.filter(function (o) {
        return o !== del
    }));
    return options;
}

//TODO Ideally we would like to include all the trend comparisons. But its too slow. Hence not using any ranking for now
function parameterize_group(query){
    const i = plot_index(query);
    const first = get_token_at(5, query);
    const second = get_token_at(7, query);
    const first_options = titles_given_top(first, i);
    const second_options = titles_given_top(second, i);
    return ["GROUP FROM SUBPLOT ", subplot_list_with_input_as_first(i), "TREND", first_options, " TREND", second_options ]
}

function titles_given_top(top, i){
    const titles = get_titles_for_svg(i);
    var options = [top];
    options = options.concat(titles.filter(function (o) {
        return o !== top
    }));
    return options;
}

function parameterize_split(query){
    const i = plot_index(query);
    const title = get_token_at(5, query);
    const options = splits_given_top(title, i);
    return ["SPLIT FROM SUBPLOT ", subplot_list_with_input_as_first(i), "TREND", options]
}

function splits_given_top(title){
    const groups = available_group_names();
    var options = [title];

    options = options.concat(groups.filter(function(g){
        return ((index_from_title(g) === index_from_title(title)) && (g !== title ))
    }).sort(function(a, b){
        return sim[b] - sim[a]
    }));
    return options
}

//TODO Using naive. Improve
function parameterize_move(query){
    const fromI = plot_index(query);
    const title = get_token_at(5, query);
    const to = get_token_at(7, query);
    const toI = index_from_subplot_name(to);
    const fromOptions = subplot_list_with_input_as_first(fromI);
    const toOptions = subplot_list_with_input_as_first(toI).filter(function(t){
        return t != "subplot" + fromI
    });
    const titles = [title].concat(get_titles_for_svg(fromI).filter(function(f){
        return f != title
    }));
    return ["MOVE FROM SUBPLOT ", fromOptions, "TREND", titles, "TO", toOptions]
}

function top_of_query(q){
    var top = "";
    for (var i = 0; i < q.length; i++) {
        if (q[i].constructor == Array) { // Menu
            top += q[i][0]
        } else {
            top += q[i]
        }
    }
    return top
}

function unified_score(query, groups, splits, moves){
    return action_recency(query) + plot_recency(query) + goodness(query, groups, splits, moves);
}

function goodness(query, groups, splits, moves){
    switch (get_type(query)){
        case "delete":
            return goodness_delete(query);
        case "group":
            return goodness_group(query, groups);
        case "split":
            return goodness_split(query, splits);
        case "move":
            return goodness_move(query, moves);
        default:
            console.log("goodness Could not match for ", query);
            return 0
    }
}

function get_type(query){
    if (query.constructor == Array){
        query = top_of_query(query)
    }
    return get_token_at(0, query)
}

function goodness_move(query, moves){
    return 1 / (1 + moves.indexOf(query))
}

function goodness_split(query, splits){
    return 1 / (1 + splits.indexOf(query))
}

function goodness_group(query, groups){
    for (var i = 0; i < groups.length; i++){
        var index = groups[i].indexOf(query);
        if (index !== -1){
            return 1 / (1 + index)
        }
    }
    console.log("this should not happen");
    return 0
}

function goodness_delete(query){
    const svg_index = plot_index(query);
    var titles = get_titles_for_svg(svg_index);
    const outlierTitles = outliers(svg_index, titles.length);
    const delTitle = get_token_at(5, query);
    for (var i = 0; i < outlierTitles.length; i++){
        if (outlierTitles[i] === delTitle){
            return 1/(1 + i)
        }
    }
    return 1 / outlierTitles.length
}

function get_token_at(index, query){
    const trimmed_lower = query.trim().toLowerCase();
    var tokens = trimmed_lower.match(/\S+/g);
    return tokens[index];
}

function recency(query, condition){
    const query_condition = condition(query);
    for (var i = query_timeline.length - 1; i >= 0; i--){
        var log_condition = condition(query_timeline[i]);
        if (log_condition === query_condition){
            return 1 / (query_timeline.length - i);
        }
    }
    return 1 / (query_timeline.length)
}

function action_recency(query){
    return recency(query, get_type)
}

function plot_recency(query){
    return recency(query, plot_index)
}

function plot_index(query){
    const subplot = get_token_at(3, query);
    if (subplot.substr(0, 7) !== "subplot"){
        throw new Error(subplot , " is wrong name for a subplot")
    }
    return +subplot.substr(7)
}