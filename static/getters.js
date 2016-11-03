function num_of_recs(){
    return $(".rec").length;
}

function svg_from_title(title){
    return svgs[index_from_title(title)];
}

function index_from_title(title){
    try{
        for (var i = 0; i < svgs.length; i++){
            var titles = get_titles_for_svg(i);
            if (titles.indexOf(title) != -1){
                return i
            }
        }
    }
    catch (e){
        console.log(e.stack);
        console.log(title + " not found");
        console.log("num svgs", svgs.length);
        throw e
    }
}
