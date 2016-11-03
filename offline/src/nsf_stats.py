"""This module takes the year,[word] dict and creates db table with columns
year, word, count which is used by cluster_link to produce cluster files"""
__author__ = 'kamat'

import unittest
import sqlite3
import pickle


class NSFStatsTest(unittest.TestCase):
  """Separate functions to create the stats db"""

  def test_create_nsf_db_original(self):
    """Create the nsf stats db which is used by cluster_link to create the
    clustered output files which is input to the UI."""
    input_file = '../output/nsf_output/nsf_word_year_count.dict'
    print "started reading ", input_file
    year_title_read = self.read_dict(input_file)
    print "finished reading ", input_file
    nsf_db = sqlite3.connect("nsf_stats_title_only.db")
    nsf_db.execute("create table counts (year int, word text, c int)")
    for year, words in year_title_read.iteritems():
      print "year ", year
      word_counts = self.create_counts_from_list(words)
      for word, counts in word_counts.iteritems():
        if len(word) > 5:
          nsf_db.execute("insert into counts values(?, ?, ?)", (year, word, counts))
    nsf_db.commit()
    nsf_db.close()

  def read_dict(self, file1):
    with open(file1, 'rb') as handle:
      year_title_read = pickle.loads(handle.read())
    return year_title_read

  def create_counts_from_list(self, words):
    word_counts = dict()
    for word in words:
      if word in word_counts.keys():
        count = word_counts[word]
        count += 1
        word_counts[word] = count
      else:
        word_counts[word] = 1
    return word_counts
