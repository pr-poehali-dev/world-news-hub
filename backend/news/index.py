'''
Business: Manage news articles and fetch real-time news
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with news data
'''
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            limit = event.get('queryStringParameters', {}).get('limit', '50')
            cursor.execute(
                "SELECT n.*, u.name as author_name, u.is_verified FROM news n LEFT JOIN users u ON n.author_id = u.id ORDER BY n.published_at DESC LIMIT %s",
                (int(limit),)
            )
            news_list = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'news': [dict(n) for n in news_list]}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            title = body.get('title')
            content = body.get('content')
            category = body.get('category', 'General')
            image_url = body.get('image_url')
            author_id = body.get('author_id')
            is_admin_post = body.get('is_admin_post', False)
            
            cursor.execute(
                "INSERT INTO news (title, content, category, image_url, author_id, is_admin_post) VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
                (title, content, category, image_url, author_id, is_admin_post)
            )
            news_item = cursor.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'news': dict(news_item)}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            body = json.loads(event.get('body', '{}'))
            news_id = body.get('news_id')
            
            cursor.execute("DELETE FROM news WHERE id = %s", (news_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'News deleted'}),
                'isBase64Encoded': False
            }
        
        return {'statusCode': 405, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Method not allowed'}), 'isBase64Encoded': False}
    
    finally:
        cursor.close()
        conn.close()
