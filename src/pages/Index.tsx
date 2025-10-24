import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const API_BASE = 'https://functions.poehali.dev';
const AUTH_URL = `${API_BASE}/62578318-d60b-4d68-ad63-e806b2ca8065`;
const NEWS_URL = `${API_BASE}/4acc7da9-02c7-40f3-a16c-f2bb997c17a1`;
const ADMIN_URL = `${API_BASE}/e02ccb54-93f0-4611-a97b-3906da209caf`;

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  location?: string;
  preferences?: any;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

interface NewsItem {
  id: number;
  title: string;
  content: string;
  category: string;
  image_url?: string;
  published_at: string;
  author_name?: string;
  is_verified?: boolean;
  is_admin_post: boolean;
}

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [authDialog, setAuthDialog] = useState(false);
  const [adminDialog, setAdminDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [aboutText, setAboutText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [profileEdit, setProfileEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setTimeout(() => setShowSplash(false), 2000);
    fetchNews();
    fetchAbout();
    const savedUser = localStorage.getItem('user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch(NEWS_URL);
      const data = await res.json();
      setNews(data.news || []);
    } catch (error) {
      console.error('Failed to fetch news', error);
    }
  };

  const fetchAbout = async () => {
    try {
      const res = await fetch(`${ADMIN_URL}?action=settings`, {
        headers: { 'x-admin-password': 'Exx1' }
      });
      const data = await res.json();
      setAboutText(data.about || '');
    } catch (error) {
      console.error('Failed to fetch about', error);
    }
  };

  const sendCode = async () => {
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_code', email })
      });
      const data = await res.json();
      if (data.message) {
        setCodeSent(true);
        toast({ title: 'Код отправлен на email!' });
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки кода', variant: 'destructive' });
    }
  };

  const verifyCode = async () => {
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_code', email, code })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthDialog(false);
        toast({ title: 'Вход выполнен!' });
      } else {
        toast({ title: 'Неверный код', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка входа', variant: 'destructive' });
    }
  };

  const checkAdminPassword = () => {
    if (adminPassword === 'Exx1') {
      setAdminAuthenticated(true);
      fetchUsers();
      toast({ title: 'Вход в админку выполнен' });
    } else {
      toast({ title: 'Неверный пароль', variant: 'destructive' });
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${ADMIN_URL}?action=users`, {
        headers: { 'x-admin-password': 'Exx1' }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const verifyUser = async (userId: number) => {
    try {
      await fetch(ADMIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': 'Exx1' },
        body: JSON.stringify({ action: 'verify_user', user_id: userId })
      });
      fetchUsers();
      toast({ title: 'Пользователь верифицирован!' });
    } catch (error) {
      toast({ title: 'Ошибка верификации', variant: 'destructive' });
    }
  };

  const postAsSpawner = async () => {
    try {
      await fetch(ADMIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': 'Exx1' },
        body: JSON.stringify({
          action: 'post_as_spawner',
          title: newPostTitle,
          content: newPostContent,
          category: newPostCategory || 'Announcement'
        })
      });
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('');
      fetchNews();
      toast({ title: 'Объявление опубликовано!' });
    } catch (error) {
      toast({ title: 'Ошибка публикации', variant: 'destructive' });
    }
  };

  const updateAbout = async () => {
    try {
      await fetch(ADMIN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': 'Exx1' },
        body: JSON.stringify({ action: 'update_about', about: editAbout })
      });
      setAboutText(editAbout);
      toast({ title: 'О приложении обновлено!' });
    } catch (error) {
      toast({ title: 'Ошибка обновления', variant: 'destructive' });
    }
  };

  const updateProfile = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(AUTH_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          name: editName,
          location: editLocation
        })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setProfileEdit(false);
        toast({ title: 'Профиль обновлен!' });
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления профиля', variant: 'destructive' });
    }
  };

  if (showSplash) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <Icon name="Newspaper" size={80} className="text-white mx-auto mb-4 animate-pulse" />
          <h1 className="text-5xl font-bold text-white mb-2">News of World</h1>
          <p className="text-xl text-blue-100">Ваш источник мировых новостей</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex gap-2">
            {!currentUser && (
              <Button onClick={() => setAuthDialog(true)} variant="outline" size="sm">
                <Icon name="LogIn" size={16} className="mr-2" />
                Регистрация
              </Button>
            )}
            <Button onClick={() => setAdminDialog(true)} variant="outline" size="sm">
              <Icon name="Shield" size={16} className="mr-2" />
              Админ
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-blue-900">News of World</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {news.map((item) => (
              <Card key={item.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={item.is_admin_post ? 'destructive' : 'secondary'}>
                        {item.category}
                      </Badge>
                      {item.is_verified && (
                        <Badge variant="default" className="bg-cyan-500">
                          <Icon name="CheckCircle2" size={12} className="mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h2>
                    <p className="text-gray-600 mb-3">{item.content}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Icon name="User" size={14} />
                      <span>{item.author_name || 'Аноним'}</span>
                      <span>•</span>
                      <Icon name="Clock" size={14} />
                      <span>{new Date(item.published_at).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'about' && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">О приложении</h2>
            <p className="text-gray-700 text-lg leading-relaxed">{aboutText}</p>
          </Card>
        )}

        {activeTab === 'profile' && currentUser && (
          <Card className="p-6">
            <div className="flex items-start gap-6 mb-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={currentUser.avatar_url} />
                <AvatarFallback className="text-2xl bg-blue-100 text-blue-900">
                  {currentUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                  {currentUser.is_verified && (
                    <Badge className="bg-cyan-500">
                      <Icon name="CheckCircle2" size={14} className="mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600">{currentUser.email}</p>
                {currentUser.location && (
                  <p className="text-gray-500 flex items-center gap-1 mt-1">
                    <Icon name="MapPin" size={14} />
                    {currentUser.location}
                  </p>
                )}
                <p className="text-sm text-gray-400 mt-2">
                  Зарегистрирован: {new Date(currentUser.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>

            {!profileEdit ? (
              <Button onClick={() => {
                setProfileEdit(true);
                setEditName(currentUser.name);
                setEditLocation(currentUser.location || '');
              }}>
                <Icon name="Edit" size={16} className="mr-2" />
                Редактировать профиль
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Имя</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label>Местоположение</Label>
                  <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={updateProfile}>Сохранить</Button>
                  <Button variant="outline" onClick={() => setProfileEdit(false)}>Отмена</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-around">
          <Button
            variant={activeTab === 'home' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('home')}
            className="flex-col h-auto py-2"
          >
            <Icon name="Home" size={24} />
            <span className="text-xs mt-1">Главная</span>
          </Button>
          <Button
            variant={activeTab === 'about' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('about')}
            className="flex-col h-auto py-2"
          >
            <Icon name="Info" size={24} />
            <span className="text-xs mt-1">О приложении</span>
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            onClick={() => {
              if (currentUser) setActiveTab('profile');
              else {
                toast({ title: 'Войдите, чтобы увидеть профиль', variant: 'destructive' });
                setAuthDialog(true);
              }
            }}
            className="flex-col h-auto py-2"
          >
            <Icon name="User" size={24} />
            <span className="text-xs mt-1">Я</span>
          </Button>
        </div>
      </nav>

      <Dialog open={authDialog} onOpenChange={setAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Вход / Регистрация</DialogTitle>
          </DialogHeader>
          {!codeSent ? (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <Button onClick={sendCode} className="w-full">
                Отправить код
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Введите 4-значный код из email</Label>
                <div className="flex justify-center mt-2">
                  <InputOTP maxLength={4} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button onClick={verifyCode} className="w-full" disabled={code.length !== 4}>
                Подтвердить
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={adminDialog} onOpenChange={setAdminDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Админ-панель</DialogTitle>
          </DialogHeader>
          {!adminAuthenticated ? (
            <div className="space-y-4">
              <div>
                <Label>Пароль админа</Label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Введите пароль"
                />
              </div>
              <Button onClick={checkAdminPassword} className="w-full">
                Войти
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">Пользователи</TabsTrigger>
                <TabsTrigger value="post">Публикация</TabsTrigger>
                <TabsTrigger value="settings">Настройки</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="space-y-2">
                {users.map((user) => (
                  <Card key={user.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    {!user.is_verified && (
                      <Button onClick={() => verifyUser(user.id)} size="sm">
                        Верифицировать
                      </Button>
                    )}
                    {user.is_verified && (
                      <Badge className="bg-cyan-500">
                        <Icon name="CheckCircle2" size={14} className="mr-1" />
                        Verified
                      </Badge>
                    )}
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="post" className="space-y-4">
                <div>
                  <Label>Заголовок</Label>
                  <Input value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Категория</Label>
                  <Input value={newPostCategory} onChange={(e) => setNewPostCategory(e.target.value)} placeholder="Announcement" />
                </div>
                <div>
                  <Label>Содержание</Label>
                  <Textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} rows={5} />
                </div>
                <Button onClick={postAsSpawner} className="w-full">
                  Опубликовать от Spawner
                </Button>
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <div>
                  <Label>О приложении</Label>
                  <Textarea
                    value={editAbout}
                    onChange={(e) => setEditAbout(e.target.value)}
                    rows={6}
                    placeholder={aboutText}
                  />
                </div>
                <Button onClick={updateAbout} className="w-full">
                  Сохранить
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
