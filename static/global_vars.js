/**
 * Created by kamat on 6/10/16.
 */

/*global window */
function setGlobalVars() {
    window.num_charts = 12;
    window.num_empty_charts = 0;

    window.svgs = [];//Needed:

    window.del_title_line = {}; // Needed to undo delete actions
    window.where_query_and_subQueries = {}; // Needed to find out what queries the where queries meant
    window.sim = {}; // Not strictly needed. Not as much harm to keep it

// TODO: Check if can be removed
    window.svg_legend = new WeakMap();
    window.svg_line = new WeakMap();
    window.svg_YScale = new WeakMap();

// a and b create a group. It goes to groupsAvailable as ab.
// Now ab and c create a group. (ab)c goes to groupsAvailable. ab goes to groupsUnavailable
// (ab)c is split . (ab)c is deleted from groupsAvailable,
// Check its children in groupsUnavailable and if present which is true in this case as ab
// add it to groupsAvailable and remove from groupsUnavailable
    window.available_groups = []; // Needed to keep track of groups that are part of other groups
    window.unavailable_groups = [];// Needed: See available_groups

    window.svg_color = new WeakMap();
    window.title_color = {};
    window.title_index_color = {};

    window.selected_trend = null; // Needed: See isTrendSelected
    window.last_click_time = null; // Needed: Sometimes multiple left clicks are issued on a single mouse click

    window.query_timeline = []; // Needed to keep track of which queries have been run so far

// After every action create <query, sem_temp_class>
    window.query_constraint = {};

    window.redraw = false;

// box variables
    window.drawing_box = false;
    window.mouse_down = false;
    window.box_click_start = null;
    window.box = null;

// menu variables
    window.mainY = null;
    window.mainX = null;
    window.selected_titles = null;
    window.svg_idx = null;
    window.append_option_again = null;
    window.ul_index = 0;

// sketch
    window.data_sketch = [];
    window.path_sketch = null;
    window.drawing_sketch = false;
    window.line_sketch = null;
    window.svg_sketch = null;
}
