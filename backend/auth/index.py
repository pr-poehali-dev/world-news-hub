'''
Business: Handle user registration with email verification codes
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict
'''
import json
import random
import os
from datetime import datetime, timedelta
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def generate_code() -> str:
    return str(random.randint(1000, 9999))

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
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'send_code':
                email = body.get('email', '').strip().lower()
                if not email:
                    return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Email required'}), 'isBase64Encoded': False}
                
                code = generate_code()
                expires_at = datetime.now() + timedelta(minutes=10)
                
                cursor.execute(
                    "INSERT INTO verification_codes (email, code, expires_at) VALUES (%s, %s, %s)",
                    (email, code, expires_at)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Code sent', 'code': code}),
                    'isBase64Encoded': False
                }
            
            elif action == 'verify_code':
                email = body.get('email', '').strip().lower()
                code = body.get('code', '')
                
                cursor.execute(
                    "SELECT * FROM verification_codes WHERE email = %s AND code = %s AND expires_at > NOW() AND used = false ORDER BY created_at DESC LIMIT 1",
                    (email, code)
                )
                verification = cursor.fetchone()
                
                if not verification:
                    return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Invalid or expired code'}), 'isBase64Encoded': False}
                
                cursor.execute("UPDATE verification_codes SET used = true WHERE id = %s", (verification['id'],))
                
                cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
                user = cursor.fetchone()
                
                if not user:
                    cursor.execute(
                        "INSERT INTO users (email, name) VALUES (%s, %s) RETURNING *",
                        (email, f"User_{random.randint(1000, 9999)}")
                    )
                    user = cursor.fetchone()
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': dict(user)}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            user_id = event.get('queryStringParameters', {}).get('user_id')
            if user_id:
                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user = cursor.fetchone()
                if user:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'user': dict(user)}),
                        'isBase64Encoded': False
                    }
            return {'statusCode': 404, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'User not found'}), 'isBase64Encoded': False}
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('user_id')
            updates = {}
            
            if 'name' in body:
                updates['name'] = body['name']
            if 'avatar_url' in body:
                updates['avatar_url'] = body['avatar_url']
            if 'location' in body:
                updates['location'] = body['location']
            if 'preferences' in body:
                updates['preferences'] = json.dumps(body['preferences'])
            
            if updates:
                set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])
                values = list(updates.values()) + [user_id]
                cursor.execute(f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = %s RETURNING *", values)
                user = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': dict(user)}),
                    'isBase64Encoded': False
                }
        
        return {'statusCode': 405, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Method not allowed'}), 'isBase64Encoded': False}
    
    finally:
        cursor.close()
        conn.close()
