import sqlite3
from collections import *
import numpy as np
from scipy.cluster.hierarchy import fcluster
from fastcluster import linkage
import scipy.spatial.distance as ssd


def create_tsv_cluster_files(output_base_file_name, nsf_db, glove_file,
                             metric, actions=None):
  print "starting cluster"
  cluster_list = create_feature_and_cluster(nsf_db, glove_file, metric,
                                            actions)
  print "ended cluster_and_render"
  print "starting writing clusters"
  write_tsv_clusters(cluster_list, output_base_file_name)
  print "finished writing clusters"
  return len(cluster_list)

def create_feature_and_cluster(dbname, glove_file, metric, actions):
  temporal_norm_sem, title_temporal = create_title_features(dbname, glove_file)
  return perform_cluster(temporal_norm_sem, title_temporal, metric, actions)

def create_title_features(dbname, glove_file):
  title_temporal, title_temporal_norm_sem = \
    title_temporal_and_title_temporal_norm_sem(dbname, glove_file)
  temporal_norm_sem = title_temporal_norm_sem[:, 1:].astype(float)
  print "Number of words ", len(title_temporal_norm_sem)
  return temporal_norm_sem, title_temporal

def title_temporal_and_title_temporal_norm_sem(dbname, glove_file):
  minyear, maxyear = 1970, 2014
  title_temporal = title_temporal_counts(dbname, minyear, maxyear, glove_file)
  temporal_counts = title_temporal[:, 1:].astype(float)
  temporal_counts_norm = [l / (max(l)) for l in temporal_counts]
  title_temporal_norm = [[vect[0]] + temporal_counts_norm[i].tolist() for
                         i, vect in enumerate(title_temporal)]
  title_temporal_norm_sem = add_semantic_features(title_temporal_norm,
                                                  glove_file)
  return title_temporal, title_temporal_norm_sem

# Returns a matrix. row is [word, count_minyear, ... count_maxyear]
def title_temporal_counts(dbname, minyear, maxyear, glove_file):
  db = sqlite3.connect(dbname)
  r = db.execute("select word, year, c from counts order by word, year")
  vects = defaultdict(dict)  # dict of dict
  for w, y, c in r:
    l = vects[w]
    l[y] = c
  all_glove = all_glove_word_vector(glove_file)
  ret = []
  for w in vects:
    d = vects[w]  # dict of year:count
    counts = [float(d.get(y, 0.)) for y in xrange(minyear, maxyear + 1)]
    # 340 limit : 1138 words : time needed 8 minutes
    # 30: 2850 words. like a minute
    # 20: 3504. like a minute
    # 10: 4942. 2 minutes : good output
    # 5: 6825 2 minutes
    if sum(counts) < 20 or w not in all_glove:
      # if w not in all_glove: #TODO do not put sum clause here
      continue
    smooth = []
    for i in xrange(len(counts)):
      smooth.append(1 + np.mean(counts[i:i + 3]))  # TODO Remove 1 later
    ret.append([w] + smooth)
  return np.array(ret)

def add_semantic_features(vects, glove_file):
  word_vector_dict = all_glove_word_vector(glove_file)
  vects_with_semantic = map(lambda v: v + word_vector_dict[v[0]], vects)
  return np.array(vects_with_semantic)

def all_glove_word_vector(glove_file_name):
  word_vector_dict = dict()
  with open(glove_file_name) as f:
    lines = f.readlines()
  for line in lines:
    tokens = line.split()
    word_vector_dict[tokens[0]] = tokens[1:]
  return word_vector_dict

def perform_cluster(temporal_norm_sem, title_temporal, metric, actions):
  indices_togeterornot = None
  if actions is not None:
    indices_togeterornot = actions_to_indices(title_temporal, actions)
  combined_dist = compute_dist(temporal_norm_sem, metric, indices_togeterornot)
  cluster_listing = run_linkage(combined_dist, title_temporal,
                                indices_togeterornot)
  return cluster_listing

def actions_to_indices(title_temporal, actions):
  # Convert title_temporal to title index
  title_index = {}
  for idx, tt in enumerate(title_temporal):
    title_index[tt[0]] = idx

  def titles_to_indices(titles):
    return map(lambda title: title_index[title], titles.split('_'))

  # Convert actions to the titles and whether together or not
  # indices_togeterornot = {}
  indices_togeterornot = []
  for action in actions:
    firsts = titles_to_indices(action[0])
    seconds = titles_to_indices(action[1])
    for first in firsts:
      for second in seconds:
        indices = [first, second, action[2]]
        indices_togeterornot.append(indices)
  return indices_togeterornot

def compute_dist(data, metric, indices_togeterornot):
  distances = [[0 for __ in xrange(len(data))] for __ in xrange(len(data))]
  maximum = 0
  for i in xrange(len(data)):
    print "i ", i
    for j in xrange(i + 1, len(data)):
      if metric is not None:
        dist = metric_dist(data[i], data[j], metric)
      else:
        dist = euclidean_dist(data[i], data[j])
      if dist > maximum:
        maximum = dist
      distances[i][j] = distances[j][i] = dist
  if indices_togeterornot is not None:
    for constraint in indices_togeterornot:
      if constraint[2] == '0':
        distances[constraint[0]][constraint[1]] = 100 * maximum
        distances[constraint[1]][constraint[0]] = 100 * maximum
        print "0"
      elif constraint[2] == '1':
        distances[constraint[0]][constraint[1]] /= 100
        distances[constraint[1]][constraint[0]] /= 100
        print "1"
      else:
        print constraint
        raise Exception("constraint type should be 0 separate or 1 together")
  return distances

def metric_dist(x, y, metric):
  diff = np.subtract(x, y)
  right = metric.dot(np.transpose(diff))
  return diff.dot(right)

def euclidean_dist(x, y):
  return np.sqrt(np.sum((x - y) ** 2))

def run_linkage(combined_dist, title_temporal, indices_togeterornot):
  print "starting run_linkage"
  dist_array = ssd.squareform(combined_dist)
  clustering = linkage(dist_array, method='single')
  labels = fcluster(clustering, 1.15)  # TODO Check
  cluster_list = []
  title_temporal_dict = matrix_to_dict(title_temporal)
  for label in set(labels):
    idxs = labels == label
    cluster = title_temporal[idxs]
    cluster = sorted(cluster, key=lambda t: np.median(t[1:].astype(float)),
                     reverse=True)
    if not len(cluster):
      continue
    cluster = map(lambda c: [c[0]] + title_temporal_dict[c[0]], cluster)
    cluster = np.array(cluster)
    cluster = cluster[:15]
    cluster_list.append(cluster)
  cluster_list = filter(lambda c: len(c) > 8, cluster_list)
  cluster_list = sorted(cluster_list, key=lambda t: median_across_year_word(t),
                        reverse=True)
  if indices_togeterornot is not None:
    constraint_cluster_results(cluster_list, indices_togeterornot,
                               title_temporal)
  print "Ending run_dbscan, after filtering numclusters", len(cluster_list)
  return cluster_list

def matrix_to_dict(title_temporal):
  title_temp_dict = dict()
  for tt in title_temporal:
    title_temp_dict[tt[0]] = tt[1:].tolist()
  return title_temp_dict

def median_across_year_word(cluster):
  medians_for_words = map(
    lambda word_count: np.median(word_count[1:].astype(float)),
    cluster)
  return np.median(medians_for_words)

def constraint_cluster_results(cluster_list, indices_togeterornot,
                               title_temporal):
  def indices_to_titles(title_temporal, indices_togeterornot):
    titles_togetherornot = []
    for indices in indices_togeterornot:
      titles_togetherornot.append([title_temporal[indices[0]][0]
                                     .encode('ascii', 'ignore'),
                                   title_temporal[indices[1]][0]
                                     .encode('ascii', 'ignore'),
                                   indices[2]])
    return titles_togetherornot

  titles_togetherornot = indices_to_titles(title_temporal,
                                           indices_togeterornot)

  def ensure_delete_actions(cluster_list, titles_togetherornot):
    titles_list = []
    for cluster in cluster_list:
      titles_list.append(
        set(map(lambda trend: trend[0].encode('ascii', 'ignore'), cluster)))
    delete_constraints = filter(lambda x: str(x[2]) == '0',
                                titles_togetherornot)
    # Search through all deleted words. If the second word is present
    # delete first word
    searched = set()
    for dc in delete_constraints:
      del_word = dc[0]
      if del_word in searched:
        continue
      else:
        searched.add(del_word)
        for idx, titles in enumerate(titles_list):
          if del_word in titles and dc[1] in titles:
            cluster = cluster_list[idx]
            cluster = filter(lambda trend:
                             trend[0].encode('ascii', 'ignore') != del_word,
                             cluster)
            cluster_list[idx] = cluster
            break

  ensure_delete_actions(cluster_list, titles_togetherornot)

def write_tsv_clusters(clusters, base_file_name):
  def delete_files():
    print "base_file_name", base_file_name
    last_forward_slash = base_file_name.rfind("/")
    directory = base_file_name[:last_forward_slash]
    files = base_file_name[last_forward_slash + 1:] + "*"
    print "directory", directory, "files", files

    # http://stackoverflow.com/questions/1548704/delete-multiple-files-matching-a-pattern
    def purge(dir, pattern):
      import os, re

      for file_name in os.listdir(dir):
        if re.search(pattern, file_name):
          os.remove(os.path.join(dir, file_name))

    purge(directory, files)

  delete_files()
  orig_columns = len(clusters[0][0])
  for cluster_index, cluster in enumerate(clusters):
    orig_rows = len(cluster)
    f = open(base_file_name + str(cluster_index) + '.txt', 'w')
    # Write Column Header
    f.write('year' + '\t')
    # Words or trend names
    for i in xrange(orig_rows):
      f.write(cluster[i][0])
      if not i == orig_rows - 1:
        f.write('\t')
    f.write('\n')
    for j in xrange(1, orig_columns):
      f.write(str(1969 + j) + '\t')
      for i in xrange(orig_rows):
        f.write(cluster[i][j])
        if not i == orig_rows - 1:
          f.write('\t')
      f.write('\n')
    f.close()


if __name__ == '__main__':
  output_base_file_name = \
    '../../../static/nsf_counts_by_year_files/nsf_semantic_linkage'
  nsf_db = 'nsf_stats_title_only.db'
  glove_file = 'glove.6B.50d.txt'
  create_tsv_cluster_files(output_base_file_name=output_base_file_name,
                           nsf_db=nsf_db,
                           glove_file=glove_file, metric=None)
  print "ending cluster"
