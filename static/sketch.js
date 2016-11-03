// based on http://bl.ocks.org/cloudshapes/5661984 by cloudshapes
function set_sketch(){
    window.line_sketch = d3.svg.line()
        .interpolate("bundle") // basis, see http://bl.ocks.org/mbostock/4342190
        .tension(1)
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; });
    window.svg_sketch = d3.select("#svg_sketch").append("svg")
        .attr("width", width_sketch)
        .attr("height", height_sketch);

    svg_sketch
        .on("mousedown", listen)
        .on("mouseup", ignore)
        .on("mouseleave", ignore);
}

function listen () {
    delete_sketch_line();
    window.drawing_sketch = true;
    window.data_sketch = []; // reset point data
    window.path_sketch = svg_sketch.append("path") // start a new line
        .data([data_sketch])
        .attr("class", "line_sketch")
        .attr("d", line_sketch);
    if (d3.event.type === "mousedown") {
        svg_sketch.on("mousemove", on_move);
    }
}

function on_move (e) {
    if (d3.event.type === "mousemove") {
        var point = d3.mouse(this);
        data_sketch.push({ x: point[0], y: point[1] });
        tick();
    }
}

function tick() {
    path_sketch.attr("d", function(d) { return line_sketch(d); }); // Redraw the path:
}

function ignore () {
    svg_sketch.on("mousemove", null);
    if (!drawing_sketch){return;}
    window.drawing_sketch = false;
    tick();
    titles_of_similar_shape(data_sketch);
}

function delete_sketch_line(){
    d3.select(".line_sketch").remove();
}

function titles_of_similar_shape(points){
    // Normalize with respect to the max value in the plot
    function normalize(ys, max) {
        const least_y = Math.min.apply(Math, ys);
        const ys_min_zero = ys.map(function (y) {
            return y - least_y;
        });
        var normalized_points = ys_min_zero.map(function (y) {
            return y / max;
        });
        return normalized_points;
    }

    const ys = points.map(function(p){
        return height_sketch - p.y;
    });

    var normalized_ys = normalize(ys, height_sketch);

    const out_size = counts_from_title(get_titles_for_svg(0)[0]).length;
    const interpolated = interpolate_array(normalized_ys, out_size);

    var all_counts_normalized = [];
    for (var i = 0; i < svgs.length; i++){
        let max = max_count_in_svg(i);
        all_counts_normalized = all_counts_normalized.concat(get_titles_for_svg(i).map(function(t){
            return normalize(counts_from_title(t), max);
        }))
    }

    const distances = all_counts_normalized.map(function(t){
        return euclidean_distance(t, interpolated)
    });
    const indices = sort_with_indices_ascending(distances);

    undash_previous_titles();

    const new_titles = all_titles();
    $("#matches1").empty();
    for (i = 0; i < 10; i++){
        var match = document.createElement("li");
        match.setAttribute("class", "match");
        var title = new_titles[indices[i]];
        match.innerHTML = title;
        dash(svg_from_title(title), title);
        $("#matches1").append(match)
    }
}

function undash_previous_titles(){
    var lis = document.getElementById("matches1").getElementsByTagName("li");
    for (var i = 0; i < lis.length; i++){
        undash(lis[i].innerHTML)
    }
    return []
}

//http://stackoverflow.com/questions/26941168/javascript-interpolate-an-array-of-numbers
function interpolate_array(data, fit_count) {

    var linear_interpolate = function (before, after, at_point) {
        return before + (after - before) * at_point;
    };

    var new_data = [];
    var spring_factor = Number((data.length - 1) / (fit_count - 1));
    new_data[0] = data[0]; // for new allocation
    for ( var i = 1; i < fit_count - 1; i++) {
        var tmp = i * spring_factor;
        var before = Number(Math.floor(tmp)).toFixed();
        var after = Number(Math.ceil(tmp)).toFixed();
        var at_point = tmp - before;
        new_data[i] = linear_interpolate(data[before], data[after], at_point);
    }
    new_data[fit_count - 1] = data[data.length - 1]; // for new allocation
    return new_data;
}

function all_titles(){
    var titles = [];
    for (var i = 0; i < svgs.length; i++){
        titles = titles.concat(get_titles_for_svg(i))
    }
    return titles
}