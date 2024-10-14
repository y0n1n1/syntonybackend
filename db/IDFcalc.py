import numpy as np # type: ignore

def tf(word, document):
    return document.count(word) / word_len(document)

def tfbool(word, document):
    return True if document.count(word)>0 else False

def tfcount(word, document):
    return document.count(word)

def idf(word, corpus):
    count_of_documents = len(corpus) + 1
    count_of_documents_with_word = sum([1 for doc in corpus if word in doc]) + 1
    idf = np.log10(count_of_documents/count_of_documents_with_word) + 1
    return idf

def tfidf(word, document, corpus):
    return tf(word, document) * idf(word, corpus)


# once a month: take all words in corpus, run idf for each word, 
# update a db that contains every word and their idf value
# then make the tf-idf query basically just a tf calculator and then 
# get on the DB what the idf is and then calculate tf-idf


# https://medium.com/@coldstart_coder/understanding-and-implementing-tf-idf-in-python-a325d1301484