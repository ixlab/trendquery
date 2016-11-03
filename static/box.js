//TODO Consider unbind
function set_box_events(chart_id){
    $(chart_id).mousedown(function(){
        window.mouse_down = true;
    });

    $(chart_id).mouseup(function(event){
        if (mouse_down){
            end_box(event);
        }
    });

    $(chart_id).mouseleave(function(event){
        if (mouse_down){
            end_box(event);
        }
    });

    $(chart_id).mousemove(function(event){
        if (mouse_down){
            if (box_click_start === null){
                window.box_click_start = event;
            }
            redraw_box(event);
        }
    });
}

function get_xywh(start, end){
    const svg = get_clicked_svg(end);
    const bounding_box = svg[0][0].getBoundingClientRect();
    if (start.pageX < end.pageX){
        var top_left_x = start.pageX;
    } else {
        top_left_x = end.pageX;
    }
    if (start.pageY < end.pageY){
        var top_left_y = start.pageY;
    } else {
        top_left_y = end.pageY;
    }
    const x = top_left_x - bounding_box.left - margin.left;
    const y = top_left_y - bounding_box.top;
    const w = Math.abs(end.pageX - start.pageX);
    const h = Math.abs(end.pageY - start.pageY);
    return [x, y, w, h];
}

function redraw_box(currentEvent){
    if (box !== null) {
        box.remove();
    }
    drawBox();
    function drawBox(){
        const svg = get_clicked_svg(currentEvent);
        const xywh = get_xywh(box_click_start, currentEvent);
        window.box = svg.append("rect")
            .attr("x", xywh[0])
            .attr("y", xywh[1])
            .attr("width", xywh[2])
            .attr("height", xywh[3])
            .style("fill", "none")
            .style("stroke", "black");
    }
}

function end_box(click_end){
    window.drawing_box = false;
    window.mouse_down = false;
    if (box_click_start === null || click_end === box_click_start){
        return;
    }
    if (box !== null){
        box.remove();
    }
    const svg = get_clicked_svg(click_end);
    const xywh = get_xywh(box_click_start, click_end);
    var paths = find_all_paths_in_svg(svg);
    const titles_in_box = intersection(paths, xywh, svg);
    titles_in_box.map(function(t){
        dash(svg, t);
    });

    if (titles_in_box.length > 0){
        show_menu(box_click_start, titles_in_box);
    }
    window.box_click_start = null;
}

function max_count_in_svg(svgIndex) {
    const titles = get_titles_for_svg(svgIndex);
    return Math.max.apply(Math, titles.map(function (t) {
        return Math.max.apply(Math, counts_from_title(t));
    }));
}

function intersection(paths, xywh, svg){
    const start_year = 1970 + xywh[0] * 45 / width;
    const start_count = (height - xywh[1]) * max_count_in_svg(index_of_svg(svg)) / height;
    const end_year = 1970 + (xywh[0] + xywh[2]) * 45 / width;
    const end_count = (height - xywh[1] - xywh[3]) * max_count_in_svg(index_of_svg(svg)) / height;
    const datas = paths.map(function(path){
        return path.__data__;
    });
    return datas
        .filter(function(data){
            for (var i = 0; i < data.values.length; i++){
                if (data.values[i].year >= start_year &&
                    data.values[i].year <= end_year &&
                    data.values[i].count <= start_count &&
                    data.values[i].count >= end_count){
                    return true
                }
            }
            return false
        })
        .map(function(data){
            return data.name
        })
}