import json

import numpy as np
from metric_learn import ITML
from operator import add

import offline.src.cluster_link as cluster_link

from flask import Flask, request
app = Flask(__name__, static_url_path='')

@app.route('/')
def root():
  return app.send_static_file('trend.html')

@app.route('/save_log', methods=['GET', 'POST'])
def save_log():
  print "inside save_log"
  queries = request.get_json().get("queries")
  import time
  f = open('static/query_log/' + time.strftime("%H_%M_%S") + ".log", 'w')
  for query in queries:
    f.write(query + "\n")
  f.close()
  return ""

def create_metric(actions, temporal_norm_sem, title_index):
  a = []
  b = []
  c = []
  d = []
  for action in actions:
    if action[2] == "0":
      c.append(title_index[action[0]])
      d.append(title_index[action[1]])
    elif action[2] == "1":
      a.append(title_index[action[0]])
      b.append(title_index[action[1]])
  constraints = (np.array(a), np.array(b), np.array(c), np.array(d))
  # Fit
  itml = ITML()
  itml.fit(temporal_norm_sem, constraints, verbose=False)
  metric_matrix = super(ITML, itml).metric()
  print "metric", metric_matrix
  return metric_matrix


@app.route('/recluster', methods=['GET', 'POST'])
def recluster():
  # Get actions
  actions = request.get_json().get("actions")
  actions = map(lambda action:
                map(lambda a: a.encode('ascii', 'ignore'), action.split(",")),
            actions)
  # Get titles and features
  _, title_temporal_norm_sem = \
    cluster_link.title_temporal_and_title_temporal_norm_sem(
      'offline/src/nsf_stats_title_only.db', 'offline/src/glove.6B.50d.txt')
  title_index = {}
  temporal_norm_sem = []
  for idx, tf in enumerate(title_temporal_norm_sem):
    title_index[tf[0]] = idx
    temporal_norm_sem.append(map(float, tf[1:]))
  # Some terms in actions might be groups. We need an entry for them
  for action in actions:
    for a in action[:2]:
      groups = a.split("_")
      if len(groups) > 1 and a not in title_index.keys():
        summed = temporal_norm_sem[title_index[groups[0]]]
        for group in groups[1:]:
          summed = map(add, summed, temporal_norm_sem[title_index[group]])
        averaged = map(lambda f: f / len(groups), summed)
        temporal_norm_sem.append(averaged)
        title_index[a] = len(temporal_norm_sem) - 1
  temporal_norm_sem = np.array(temporal_norm_sem)
  M = create_metric(actions, temporal_norm_sem, title_index)
  output_base_file_name = 'static/nsf_counts_by_year_files/redraw/nsf_semantic_linkage'
  nsf_db = 'offline/src/nsf_stats_title_only.db'
  glove_file = 'offline/src/glove.6B.50d.txt'
  num_clusters = cluster_link.create_tsv_cluster_files(
                           output_base_file_name=output_base_file_name,
                           nsf_db=nsf_db,
                           glove_file=glove_file, metric=M, actions=actions)
  return json.dumps(num_clusters, ensure_ascii=False)


if __name__ == '__main__':
  app.run(debug=True)