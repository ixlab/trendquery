function add_move_menu_option(i) {
    var option = document.createElement("li");
    option.setAttribute("data-action", "subplot" + i);
    option.innerHTML = "subplot" + i;
    $("#movemenu").append(option);

    $(option).unbind().click(function(){
        const clicked = $(this).attr("data-action");
        const idx = index_from_subplot_name(clicked);
        if (idx != svg_idx){
            for (var j = 0; j < selected_titles.length; j++){
                move_action(selected_titles[j], svgs[svg_idx], svgs[idx], true, false)
            }
        }
        update_log_rec_ui();
        $(".custom-menu").hide(100);
        window.selected_titles = null;
        return $(this).attr("data-action")
    });
    return option;
}

function create_chart(index){
    var chart = document.createElement("span");
    chart.setAttribute("class", "chart");
    chart.setAttribute("id", chart_id(index));
    $("#charts").append(chart)
}

function chart_id(index){
    return "area" + index
}

function draw_all_charts(){
    for (var index = 0; index < num_charts - num_empty_charts; index++) {
        draw_non_empty_chart(index);
    }
    for (index = num_charts - num_empty_charts; index < num_charts; index++) {
        draw_empty_chart(index);
    }
}

function draw_non_empty_chart(index){
    if (redraw){
        var fileName = "nsf_counts_by_year_files/redraw/nsf_semantic_linkage" + index + ".txt"
    } else {
        fileName = "nsf_counts_by_year_files/start/nsf_semantic_linkage" + index + ".txt"
    }
    draw_chart(index, fileName, true)
}

function add_empty_chart(){
    const index = num_charts;
    num_charts++;
    num_empty_charts++;
    draw_empty_chart(index);
}

function draw_empty_chart(index){
    var fileName = "empty_data.txt";
    draw_chart(index, fileName, false)
}

function draw_chart(index, file_name, is_non_empty) {
    create_chart(index);
    var svg = d3.select("#" + chart_id(index)).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svgs[index] = svg;

    function move_interaction() {
        $('#' + chart_id(index)).click(function (event) {
            if (selected_trend === null || drawing_box) {
                return
            }
            var svg_clicked = get_clicked_svg(event);
            var svg_from = svg_from_title(selected_trend.__data__.name);
            if (svg_from === svg_clicked) {
                return
            }

            move_action(selected_trend.__data__.name, svg_from, svg_clicked);
            window.selected_trend = null
        })
    }

    d3.tsv(file_name, function (error, data) {
        if (error) throw error;

        var color = d3.scale.category20();
        color.domain(d3.keys(data[0]).filter(function (key) {
            return key !== "year";
        }));

        var trends = color.domain().map(function (name) {
            return {
                name: name,
                values: data.map(function (d) {
                    return {year: +d.year, count: +d[name]};
                })
            };
        });

        var xScale = d3.scale.linear()
            .range([0, width]);
        var yScale = d3.scale.linear()
            .range([height, 0]);
        var line = d3.svg.line()
            .interpolate("basis")
            .x(function (d) {
                return xScale(d.year);
            })
            .y(function (d) {
                return yScale(d.count);
            });
        svg_line.set(svg, line);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .tickFormat(d3.format("0000"));

        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left");

        xScale.domain(d3.extent(data, function (d) {
            return +d.year;
        }));

        yScale.domain([
            d3.min(trends, function (c) {
                return d3.min(c.values, function (v) {
                    return v.count;
                });
            }),
            d3.max(trends, function (c) {
                return d3.max(c.values, function (v) {
                    return v.count;
                });
            })
        ]);
        svg_YScale.set(svg, yScale);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "-3.60em")
            .style("text-anchor", "end")
            .text("Counts");

        move_interaction();

        add_move_menu_option(index);

        set_box_events("#" + chart_id(index));

        draw_lines(svg, trends, color);

        if (is_non_empty){
            if (index + 1 == num_charts - num_empty_charts) {
                reload_recommender();
            }
        }

    });
}

function draw_lines(svg, trends, color) {
    if (color === undefined){
        color = svg_color.get(svg)
    } else {
        svg_color.set(svg, color)
    }

    // Clear all. This is needed cause sometimes city class still contains the
    // deleted cities dont know reason. So we delete all lines and redraw.
    // TODO This can be a performance issue. Check if it is
    var del_trend = svg.selectAll(".trend")
        .data([]);
    del_trend.enter().append("g")
        .attr("class", "trend");
    del_trend.exit().remove();

    // Rescale
    var yScale = svg_YScale.get(svg);
    yScale.domain([
        d3.min(trends, function (c) {
            return d3.min(c.values, function (v) {
                return v.count;
            });
        }),
        d3.max(trends, function (c) {
            return d3.max(c.values, function (v) {
                return v.count;
            });
        })
    ]);
    svg_YScale.set(svg, yScale);
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");
    svg.select(".y.axis").call(yAxis);

    var trend = svg.selectAll(".trend")
        .data(trends);

    //Enter
    trend.enter().append("g")
        .attr("class", "trend");

    //Update
    trend.append("path")
        .attr("class", "line")
        .attr("id", function(d){
            return d.name
        })
        .attr("d", function (d) {
            return svg_line.get(svg)(d.values);
        })
        .attr("data-legend", function (d) {
            return d.name
        })
        .style("stroke", function (d) {
            //return color(d.name);
            return get_color(d.name, color, svg)
        })
        .style("stroke-width", function () {
            return "3 px"
        })
        .on("click", function(){
            //We want to be able to click on svgs as well and if a line is
            // clicked we dont want to trigger click to svg.
            // Commented as does not work. TODO Fix
            //        d3.event.stopPropagation()
            //        return
        })
        // Right click: Delete
        .on("contextmenu", function () {
            d3.event.preventDefault();
            delete_action(this.__data__.name)
        })
        .on("mousemove", show_title)
        .append("title");

    function show_title(){
        d3.select("#" + this.id).select("title").text(this.id);
    }

    reset_legend(svg);

    // left click
    $(".line").on("click", function(e, d) {
        //To prevent using 2 clicks when user intends a single click
        var currentTime = new Date().getTime();
        if ((currentTime - last_click_time) < 1000){
            window.last_click_time = currentTime;
            return;
        }
        window.last_click_time = currentTime;

        if (e.which === 1){
            e.preventDefault();
            if (selected_trend !== null && (this !== selected_trend)) {
                // Another line had been clicked before, so this is a group action
                group_action(selected_trend.__data__.name, this.__data__.name);
                window.selected_trend = null;
            } else {
                // Another line had not been clicked before. So highlight the selection
                dash(svg, this.__data__.name);
                window.selected_trend = this;
            }
        }
    });

    // middle click: Split
    $(".line").on("click", function(e){
        if (e.which === 2){
            e.preventDefault();
            split_action(this.__data__.name)
        }
    })
}

function dash(svg, title){
    var selected_line = svg.select("#" + title);
    selected_line.style("stroke-dasharray", ("5,5"));
}

function undash(title){
    const svg = svg_from_title(title);
    var selected_line = svg.select("#" + title);
    selected_line.style("stroke-dasharray", ("0, 0"));
}

function get_color(title, color, svg){
    const svg_index = index_of_svg(svg);
    const key = title + "_" + svg_index;
    // Check if color exists for that svg
    if (key in title_index_color){
        const original = title_index_color[key];
        const cs = colors_in_svg(svg, title);
        if (cs.indexOf(original) == -1){
            return original
        }
    }
    const latest = latest_color(title, svg);
    if (latest != null){
        return latest
    } else {
        return new_color(color, title, svg);
    }
}

function colors_in_svg(svg, title) {
    var ts = getNewTitles(svg, title);
    return ts.map(function (t) {
        return title_index_color[t]
    });
}

function getNewTitles(svg, title) {
    var ts = get_titles_for_svg(index_of_svg(svg));
    const origI = ts.indexOf(title);
    if (origI > -1) {
        ts.splice(origI, 1);
    }
    return ts;
}

function latest_color(title, svg){
    if (title in title_color){
        const original = title_color[title];
        var ts = getNewTitles(svg, title);
        const cs = ts.map(function(t){
            return title_color[t]
        });
        if (cs.indexOf(original) == -1){
            return original
        }
    }
    return null
}

function new_color(color, title, svg) {
    const c = color(title);
    title_color[title] = c;
    title_index_color[title + "_" + index_of_svg(svg)] = c;
    return c;
}