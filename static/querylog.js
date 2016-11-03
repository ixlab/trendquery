function add_to_timeline(should_log, query) {
    if (should_log === undefined) {
        should_log = true;
    }
    if (should_log) {
        query_timeline.push(query);
    }
}

function update_log_ui(){
    const query_log_outer = document.getElementById("entries");
    clear_log();
    for (var i = 0; i < query_timeline.length; i++) {
        create_log_entry(query_timeline[i], i, query_log_outer)
    }
}

function reload_log(query, should_log){
    add_to_timeline(should_log, query);
    update_log_ui();
}

function update_log_rec_ui(){
    update_log_ui();
    reload_recommender();
}

function clear_log(){
    $("#entries").empty();
}

function create_log_entry(query, entry_index, query_log_outer_div){
    var entry = document.createElement("div");// create query_log div
    entry.setAttribute("class", "query_log");
    entry.setAttribute("id", "log" + entry_index);

    var button = document.createElement("input");
    button.setAttribute("type", "button");
    button.setAttribute("value", "Revert" + entry_index);
    button.setAttribute("onclick", "revert_log_and_charts(" + entry_index + ")");
    entry.appendChild(button);

    var entry_text = document.createElement("span");
    entry_text.innerHTML = query;
    entry.appendChild(entry_text);

    query_log_outer_div.appendChild(entry);
}

function revert_log_and_charts(entry_index){
    function clear_log_index_onwards(){
        $("#log" + entry_index).nextAll().remove();
        $("#log" + entry_index).remove();
    }

    function revert_charts_till_before(){
        const undo_queries = query_timeline.splice(entry_index);
        // the last run query should be undoed first
        const undo_queries_in_run_order = undo_queries.reverse();
        for (var i = 0; i < undo_queries_in_run_order.length; i++){
            undo_query(undo_queries_in_run_order[i])
        }
    }

    clear_log_index_onwards();
    revert_charts_till_before()
}