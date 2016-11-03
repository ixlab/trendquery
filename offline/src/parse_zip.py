"""This file is used by parse_zip_test.py. It has all the functions to
create year, [word] dict"""
__author__ = 'kamat'

import nltk
import xml.etree.ElementTree as etree
import dateutil.parser as date_parser
from nltk.corpus import stopwords
import re

def write_year_title(directory, output_file):
  """Write year, [word] dict"""
  import pickle
  year_title = parse_all_zip(directory)
  print "about to write year_title to file"
  with open(output_file, 'wb') as handle:
    pickle.dump(year_title, handle)
  print "Finished writing year_title to file"
  return year_title

def parse_all_zip(directory):
  """
  Parse all zip files in nsf directory
  :return: dict with key being the year and value being a list of set of words in
   titles
  """
  from os import listdir
  from os.path import isfile, join, splitext
  all_year_title_dict = dict()
  files = [f for f in listdir(directory) if isfile(join(directory, f))]
  files.sort()
  for file in files:
    filename, file_extension = splitext(file)
    if file_extension == ".zip":
      print "Parsing ", file
      year_title_dict = parse_zip(directory + file)
      for year, title in year_title_dict.iteritems():
        all_year_title_dict.setdefault(year, []).extend(title)
  return all_year_title_dict

def parse_zip(zip_file):
  """
  Parse individual zip files for years
:return: dict with key being the year and value being a list of set of words in
 titles
"""
  import zipfile
  import os
  year_title_dict = dict()
  zip_files = zipfile.ZipFile(zip_file, 'r')
  for zip_file in zip_files.namelist():
    xml = zip_files.extract(zip_file)
    [year, words] = get_year_title(xml)
    year_title_dict.setdefault(year, []).extend(words)
    os.remove(zip_file)
  return year_title_dict

def get_year_title(xml_file):
  """Get year and title from xml file"""
  tree = etree.parse(xml_file)
  root_tag = tree.getroot()
  award = root_tag[0]
  award_title = award.find('AwardTitle')
  award_effective_date = award.find('AwardEffectiveDate')
  stop = stopwords.words('english')
  titles = none_to_empty_string(award_title.text)
  stemmer = nltk.stem.porter.PorterStemmer()
  words = []
  for word in titles.split():
    word = re.sub(r'\W+', '', word).lower()
    stemmed_word = stemmer.stem(word)
    if word not in stop and stemmed_word not in stop:
      word = word.strip()
      if len(word) > 4 and not unicode(word).isnumeric():
        words.append(stemmed_word)
  return [date_parser.parse(award_effective_date.text).year, words]

def none_to_empty_string(none_candidate):
  if none_candidate is None:
    return ''
  return none_candidate
