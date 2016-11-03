//function recluster_and_recommend(){
//    recluster(find_recommendations)
//}

// TODO: Present changes due to clustering as suggestions to the user
//function find_recommendations(){
//    // Cluster correspondence
//    //const correspondence = create_correspondence();
//
//    // Move action
//
//    // Delete action
//
//    // Add action
//
//    // Fix recommendations to make these actions top
//
//    // New clusters without correspondence
//
//    // Old clusters without correspondence
//}

//function create_correspondence(){
//    // old files
//
//    // new files
//}

function recluster_and_redraw(){
    // IMPORTANT: This also reclusters and redraws
    // TODO Name Better
    save_log();
    recluster(redraw_everything)
}

function save_log(){
    const queries = JSON.stringify({"queries" : query_timeline});
    $.ajax({
        type: 'POST',
        url: '/save_log',
        contentType: "application/json",
        data: queries,
        async: false,
        success: function(){
        },
        error: function(){
            console.log('could not save queries')
        }
    })
}

function recluster(onSuccess){
    var result = 0; // TODO If you need result of this method, set result to something and then return result outside ajax
    const actions = create_actions();
    //console.log("actions", actions)
    if (!has_positive_and_negative_types(JSON.parse(actions)["actions"])){
        console.log("JSON.parse(actions)", JSON.parse(actions));
        alert("Reclustering needs \"belongs together\" and \"belongs separately\" actions for metric learning");
        return
    }
    $.ajax({
        type: 'POST',
        url: '/recluster',
        contentType: "application/json",
        data: actions,
        dataType: "json",
        async: false,
        // TODO Later do model correspondence, actions, etc.
        success: function(val){
            onSuccess(val);
        },
        error: function(){
            console.log('could not send actions')
        }
    })
}

function create_actions(){
    var actions = [];
    for (var i = 0; i < query_timeline.length; i++){
        var spaces_fixed = query_timeline[i].toLowerCase().replace(/\s+/g,' ').trim();
        var temp1_temp2_class = query_constraint[spaces_fixed];
        if (Array.isArray(temp1_temp2_class)){
            for (var j = 0; j < temp1_temp2_class.length; j++){
                actions.push(temp1_temp2_class[j])
            }
        } else {
            actions.push(temp1_temp2_class)
        }
    }
    const json_actions = {"actions" : actions};
    return JSON.stringify(json_actions)
}

function has_positive_and_negative_types(actions){
    var has_positive = false;
    var has_negative = false;
    for (var i = 0; i < actions.length; i++){
        var action = actions[i];
        if (action.charAt(action.length-1) === "1"){
            has_positive = true
        } else {
            has_negative = true
        }
        if (has_positive && has_negative){
            return true
        }
    }
    return false
}

function redraw_everything() {
    d3.selectAll("svg").remove();
    var redraw = true;
    start_TrendQuery(redraw)
}