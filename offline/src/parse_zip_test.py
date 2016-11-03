"""This module is used first to read input files and create year, [word]
dict"""
__author__ = 'kamat'

import unittest

from parse_zip import write_year_title

class ParseZipTest(unittest.TestCase):

  def test_write_year_title(self):
    """This method is used to create year, [word] dict that
    nsf_stats.py uses to create db. Others are just relics of helper
    functions"""
    directory = "../data/nsf_data/"
    output_file = "../output/nsf_output/nsf_word_year_count.dict"
    write_year_title(directory, output_file)
