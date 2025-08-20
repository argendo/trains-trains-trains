from flask import Flask, render_template, request, jsonify
from elasticsearch import Elasticsearch
import requests
import json
from datetime import datetime, timezone

app = Flask(__name__)
app.config['SECRET_KEY'] = 'qIFC2RMuV3y8nBnlcFDU'

es = Elasticsearch(['http://trains-elasticsearch:9200'])

@app.route('/')
def index():
    q = request.args.get('q', '')
    last_metrics = []
    try:
        last_query = {
            "size": 6,
            "sort": [{"timestamp": {"order": "desc"}}],
            "query": {
                "term": {"group_id": 1}
            }
        }
        es_resp = es.search(index="trains", body=last_query)
        for hit in es_resp.get('hits', {}).get('hits', []):
            source = hit.get('_source', {})
            last_metrics.append({
                'train_id': source.get('train_id'),
                'station': source.get('station'),
                'speed': source.get('speed'),
                'position': source.get('position'),
                'timestamp': source.get('timestamp'),
                'meta': source.get('meta')
            })
    except Exception as e:
        print(f"Error fetching last metrics: {e}")
    return render_template('search.html', q=q, last_metrics=last_metrics)

@app.route('/api/train_updates', methods=['POST'])
def train_updates():
    data = request.json
    metrics = data.get('metrics', [])
    # prepare bulk data for Elasticsearch
    bulk_data = []
    for metric in metrics:
        if 'speed' in metric and metric['speed'] is not None:
            try:
                metric['speed'] = round(float(metric['speed']), 1)
            except (ValueError, TypeError):
                metric['speed'] = None
        if 'position' in metric:
            pos = metric['position']
            try:
                if 'lat' in pos:
                    pos['lat'] = round(float(pos['lat']), 4)
                if 'lon' in pos:
                    pos['lon'] = round(float(pos['lon']), 4)
            except (ValueError, TypeError):
                pass
        bulk_data.append({"index": {"_index": "trains"}})
        bulk_data.append(metric)
    if bulk_data:
        es.bulk(body=bulk_data)
    return jsonify({'status': 'ok'})

@app.route('/search', methods=['GET', 'POST'])
def search():
    if request.method == 'POST':
        q = request.form.get('query', '')
    else:
        q = request.args.get('q', '')

    trains = []
    if q:
        query = f"(train_id:*{q}* OR station:*{q}*) AND group_id:1"
        full_url = f"http://trains-elasticsearch:9200/trains/_search?q={query}&sort=timestamp:desc"
        resp = requests.get(full_url)
        results = resp.json()
        print(results)
        hits = results.get('hits', {}).get('hits', [])
        for hit in hits:
            source = hit.get('_source', {})
            train_info = {
                'train_id': source.get('train_id'),
                'color': source.get('color'),
                'station': source.get('station'),
                'speed': source.get('speed'),
                'position': source.get('position'),
                'timestamp': source.get('timestamp'),
                'meta': source.get('meta')
            }
            trains.append(train_info)

    # Fetch last 6 inserted metrics (most recent docs) for group_id=1 only, sorted by timestamp
    last_metrics = []
    try:
        last_query = {
            "size": 6,
            "sort": [{"timestamp": {"order": "desc"}}],
            "query": {
                "term": {"group_id": 1}
            }
        }
        es_resp = es.search(index="trains", body=last_query)
        for hit in es_resp.get('hits', {}).get('hits', []):
            source = hit.get('_source', {})
            last_metrics.append({
                'train_id': source.get('train_id'),
                'station': source.get('station'),
                'speed': source.get('speed'),
                'position': source.get('position'),
                'timestamp': source.get('timestamp'),
                'meta': source.get('meta')
            })
    except Exception as e:
        print(f"Error fetching last metrics: {e}")
    return render_template('search.html', results=trains, q=q, last_metrics=last_metrics)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5015, debug=False)
