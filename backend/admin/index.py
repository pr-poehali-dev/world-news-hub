'''
Business: Admin panel operations - verify users, manage settings, post as Spawner
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict
'''
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

ADMIN_PASSWORD = 'Exx1'

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    password = headers.get('x-admin-password', '') or headers.get('X-Admin-Password', '')
    if password != ADMIN_PASSWORD:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid admin password'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            action = event.get('queryStringParameters', {}).get('action')
            
            if action == 'users':
                cursor.execute("SELECT id, email, name, is_verified, created_at FROM users ORDER BY created_at DESC")
                users = cursor.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'users': [dict(u) for u in users]}, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'settings':
                cursor.execute("SELECT * FROM app_settings WHERE key = 'about_app'")
                setting = cursor.fetchone()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'about': setting['value'] if setting else ''}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'verify_user':
                user_id = body.get('user_id')
                cursor.execute("UPDATE users SET is_verified = true WHERE id = %s RETURNING *", (user_id,))
                user = cursor.fetchone()
                conn.commit()
                
                if user:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'user': dict(user)}),
                        'isBase64Encoded': False
                    }
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'post_as_spawner':
                cursor.execute("SELECT id FROM users WHERE email = 'spawner@system' LIMIT 1")
                spawner = cursor.fetchone()
                
                if not spawner:
                    cursor.execute(
                        "INSERT INTO users (email, name, is_verified, is_admin) VALUES ('spawner@system', 'Spawner', true, true) RETURNING id"
                    )
                    spawner = cursor.fetchone()
                    conn.commit()
                
                spawner_id = spawner['id']
                title = body.get('title')
                content = body.get('content')
                category = body.get('category', 'Announcement')
                
                cursor.execute(
                    "INSERT INTO news (title, content, category, author_id, is_admin_post) VALUES (%s, %s, %s, %s, true) RETURNING *",
                    (title, content, category, spawner_id)
                )
                news = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'news': dict(news)}, default=str),
                    'isBase64Encoded': False
                }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'update_about':
                about_text = body.get('about')
                cursor.execute(
                    "INSERT INTO app_settings (key, value) VALUES ('about_app', %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
                    (about_text,)
                )
                conn.commit()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'About updated'}),
                    'isBase64Encoded': False
                }
        
        return {'statusCode': 405, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Method not allowed'}), 'isBase64Encoded': False}
    
    finally:
        cursor.close()
        conn.close()