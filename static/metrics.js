/**
 * Created by kamat on 4/17/16.
 */

//TODO cohesiveness

function similarity_from_title(title1, title2){
    const counts1 = counts_from_title(title1);
    const counts2 = counts_from_title(title2);
    return euclidean_similarity(counts1, counts2);
    //TODO Use euclidean similarity + semantic similarity
    //return cosine_similarity(counts1, counts2)
}

//function euclideanDistanceFromTitle(title1, title2){
//    const counts1 = countsFromTitle(title1);
//    const counts2 = countsFromTitle(title2);
//    return euclidean_distance(counts1, counts2);
//    //TODO Use euclidean similarity + semantic similarity
//    //return cosine_similarity(counts1, counts2)
//}

//TODO Median
function sim_of_line_with_plot(t, to_index){
    const counts1 = counts_from_title(t);
    var sims = [];
    var to_titles = get_titles_for_svg(to_index);
    if (to_titles.length == 0){
        return 0;
    }
    for (var i = 0; i < to_titles.length; i++){
        var counts2 = counts_from_title(t);
        sims.push(euclidean_similarity(counts1, counts2));
    }
    return (sims.reduce(function(a, b){return a + b})/sims.length);
}

//function cosine_similarity(counts1, counts2){
//    return dot_product(counts1, counts2)/
//        (vector_length(counts1) * vector_length(counts2))
//}

//function dot_product(counts1, counts2){
//    var sum = 0;
//    for (var i = 0; i < counts1.length; i++){
//        sum += counts1[i] * counts2[i]
//    }
//    return sum
//}

//TODO use reduce
//function vector_length(counts1){
//    var length_square = 0;
//    for (var i = 0; i < counts1.length; i++){
//        length_square += counts1[i] * counts1[i]
//    }
//    return Math.sqrt(length_square)
//}

function svg_avg_similarity(rows_of_counts1, rows_of_counts2){
    var similarity_matrix = allocate_2d_matrix(rows_of_counts1.length,
        rows_of_counts2.length);
    for (var i = 0; i < rows_of_counts1.length; i++){
        for (var j = 0; j < rows_of_counts2.length; j++){
            if (i === j) {
                similarity_matrix[i][j] = 0; // TODO Infinity?
            } else {
                similarity_matrix[i][j] = euclidean_similarity(
                    rows_of_counts1[i], rows_of_counts2[j])
            }
        }
    }
    var avg_similarity_for_first = [];
    for (i = 0; i < rows_of_counts1.length; i++){
        avg_similarity_for_first.push(average(similarity_matrix[i]))
    }
    return avg_similarity_for_first
}

function allocate_2d_matrix(num_rows, num_columns) {
    var matrix = new Array(num_rows);
    for (var i = 0; i < num_rows; i++) {
        matrix[i] = new Array(num_columns)
    }
    return matrix
}

// TODO Check to make sure numberOfOutliers < number of lines present
function outliers(svg_index, outliers_needed){
    const rows_of_counts_and_titles = create_rows_of_counts_and_titles(svg_index);
    const outliers_possible = Math.min(outliers_needed, rows_of_counts_and_titles[0].length);
    const selected_indices =  outliers_from_counts(rows_of_counts_and_titles[0],
        outliers_possible);
    var selected_outliers =
        select_at_indices(rows_of_counts_and_titles[1], selected_indices);
    function select_at_indices() {
        var titles = [];
        for (var i = 0; i < selected_indices.length; i++){
            titles.push(rows_of_counts_and_titles[1][selected_indices[i]])
        }
        return titles
    }
    return selected_outliers
}

function create_rows_of_counts_and_titles(svgIndex){
    var titles = get_titles_for_svg(svgIndex);
    var rowsOfCounts = titles.map(function(title){
        return counts_from_title(title)
    });
    return [rowsOfCounts, titles]; // TODO Return object
}

function counts_from_title(title){
    return counts_from_path(find_path(title))
}

function counts_from_path(path){
    return path.__data__.values.map(function(count_year){
        return +count_year.count
    })
}

//http://stackoverflow.com/questions/3730510/javascript-sort-array-and-return-an-array-of-indicies-that-indicates-the-positi
function sort_with_indices_ascending(to_sort) {
    var value_with_index = [];
    for (var i = 0; i < to_sort.length; i++) {
        value_with_index.push([to_sort[i], i])
    }
    value_with_index.sort(function (left, right) {
        return left[0] <= right[0] ? -1 : 1;
    });
    var indices = [];
    for (i = 0; i < value_with_index.length; i++) {
        indices.push(value_with_index[i][1])
    }
    return indices;
}

function sort_with_indices_ascending_limit(to_sort, output_count){
    var indices = sort_with_indices_ascending(to_sort);
    return indices.slice(0, output_count)
}

function sort_with_indices_descending_limit(to_sort, output_count){
    var indices = sort_with_indices_ascending(to_sort);
    var descending_indices = indices.reverse();
    return descending_indices.slice(0, output_count)
}

// Each row has counts for a path
function self_similarities(rows_of_counts) {
    var similarities = allocate_2d_matrix(rows_of_counts.length, rows_of_counts.length);
    for (var i = 0; i < rows_of_counts.length; i++) {
        for (var j = 0; j < rows_of_counts.length; j++) {
            if (i === j) {
                similarities[i][j] = 0; // TODO Max similarity can be infinity as distance can be 0
            } else {//cosine_similarity(
                similarities[i][j] = euclidean_similarity(rows_of_counts[i],
                    rows_of_counts[j])
            }
        }
    }
    return similarities;
}

function outliers_from_counts(rows_of_counts, number_of_outliers){
    var similarities = self_similarities(rows_of_counts);
    const avg_similarities = similarities.map(function(sim_array){
        return average(sim_array)
    });
    return sort_with_indices_ascending_limit(avg_similarities, number_of_outliers)
}

function average(array){
    var sum = 0;
    for (var i = 0; i < array.length; i++){
        sum += array[i]
    }
    return sum / array.length
}

//TODO Improve conversion from distance to similarity by making distance come out between 0 and 1 and (1-dist)/(1+dist)
function euclidean_similarity(data1, data2){
    //const dist = normalized_euclidean_distance(data1, data2)
    const dist = euclidean_distance(data1, data2);
    //return (1.0 - dist)/(1.0 + dist)
    return 1 / (dist + 1); // 1 added in denominator as distance with self = 0
}

// TODO Improve with dividing by the length of vector
//function normalized_euclidean_distance(data1, data2){
//    var normalized_data1 = data1.map(function(datum){
//        return datum/Math.max.apply(Math, data1)
//    });
//    var normalized_data2 = data2.map(function(datum){
//        return datum/Math.max.apply(Math, data2)
//    });
//    return euclidean_distance(normalized_data1, normalized_data2);
//}

function euclidean_distance(data1, data2){
    var dist = 0;
    for (var i = 0; i < data1.length; i++) {
        dist += Math.pow(data1[i] - data2[i], 2)
    }
    return dist
}