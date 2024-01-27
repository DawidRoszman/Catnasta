"use client";
import { useRouter } from "next/navigation";
import { useUserContext } from "../components/UserContext";
import { useEffect, useState } from "react";
import { CheckIsAdmin } from "../lib/CheckIsAdmin";
import { useCookies } from "next-client-cookies";
import axios from "axios";
import { api } from "../lib/api";

interface User {
  _id: string;
  username: string;
  password: string;
}

interface Game {
  _id: string;
}

interface Chat {
  _id: string;
  id: string;
  username: string;
  message: string;
}

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [chat, setChat] = useState<Chat[] | null>(null);
  const [message, setMessage] = useState("");
  const [disabled, setDisabled] = useState(false);
  const context = useUserContext();
  const cookies = useCookies();
  const router = useRouter();
  if (context === null) {
    return <div>Not logged in</div>;
  }

  const handleDeleteUser = async (id: string) => {
    const response = await axios.delete(api + "/users/" + id, {
      headers: {
        Authorization: `Bearer ${cookies.get("token")}`,
      },
    });
    const data = response.data;
    if (data.msg === "User deleted") {
      setUsers(users!.filter((user) => user._id !== id));
      return;
    }
    alert(data.msg);
    return;
  };

  const handleDeleteGame = async (id: string) => {
    const response = await axios.delete(api + "/games/" + id, {
      headers: {
        Authorization: `Bearer ${cookies.get("token")}`,
      },
    });
    const data = response.data;
    if (data.msg === "Game deleted") {
      setGames(games!.filter((game) => game._id !== id));
      return;
    }
    alert(data.msg);
    return;
  };

  const handleDeleteMessage = async (id: string) => {
    const response = await axios.delete(api + "/chat/delete/" + id, {
      headers: {
        Authorization: `Bearer ${cookies.get("token")}`,
      },
    });
    const data = response.data;
    if (data.msg === "Message deleted") {
      setChat(chat!.filter((chat) => chat.id !== id));
      return;
    }
    alert(data.msg);
    return;
  };

  const searchMessage = async (id: string) => {
    if (id === "") {
      const response = await axios(api + "/chat", {});
      const data: Chat[] = response.data;
      setChat(data);
      return;
    }
    const response = await axios.get(api + "/chat/search?search=" + id, {
      headers: {
        Authorization: `Bearer ${cookies.get("token")}`,
      },
    });
    const data = response.data;
    setChat(data);
  };
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDisabled(true);
    const response = await axios.post(
      api + "/send",
      {
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${cookies.get("token")}`,
        },
      },
    );
    const status = response.status;
    if (status === 200) {
      setMessage("");
    } else {
      alert("Something went wrong\n" + response.data.msg);
      return;
    }
    setTimeout(() => {
      setDisabled(false);
    }, 5000);
  };
  useEffect(() => {
    const setUpAdmin = async () => {
      const admin = await CheckIsAdmin(cookies.get("token")!);
      setIsAdmin(admin);
    };

    const fetchUsers = async () => {
      const response = await axios(api + "/users", {
        headers: {
          Authorization: `Bearer ${cookies.get("token")}`,
        },
      });
      const data: User[] = response.data;
      setUsers(data);
    };
    const fetchGames = async () => {
      const response = await axios(api + "/games", {
        headers: {
          Authorization: `Bearer ${cookies.get("token")}`,
        },
      });
      const data: Game[] = response.data;
      setGames(data);
    };

    const fetchChat = async () => {
      const response = await axios(api + "/chat", {});
      const data: Chat[] = response.data;
      setChat(data);
    };

    setUpAdmin();
    fetchUsers();
    fetchGames();
    fetchChat();
  }, []);

  if (isAdmin === null) {
    return <div>Loading...</div>;
  }
  if (!isAdmin) {
    router.replace("/");
    return <div>Redirecting...</div>;
  }
  if (users === null || games === null || chat === null) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <div className="grid place-items-center p-5">
        <h1 className="text-5xl">Welcome to admin page</h1>
      </div>
      <div className="grid grid-cols-3 place-items-center">
        <Users users={users} handleDeleteUser={handleDeleteUser} />
        <Games games={games} handleDeleteGame={handleDeleteGame} />
        <Chat
          chat={chat}
          handleDeleteMessage={handleDeleteMessage}
          searchMessage={searchMessage}
        />
      </div>
      <div className="grid place-items-center">
        <form onSubmit={(e) => handleSendMessage(e)}>
          <input
            value={message}
            className="input input-primary"
            onChange={(e) => setMessage(e.target.value)}
            type="text"
            placeholder="Write you message"
          />
          <input
            className="btn btn-primary"
            type="submit"
            disabled={disabled}
            value="Send"
          />
        </form>
      </div>
    </div>
  );
};

const Users = ({
  users,
  handleDeleteUser,
}: {
  users: User[];
  handleDeleteUser: (id: string) => void;
}) => {
  return (
    <div>
      <h1>Users</h1>
      {users.map((user) => {
        return (
          <div key={user._id} className="flex gap-3">
            <h1>{user.username}</h1>
            <button onClick={() => handleDeleteUser(user._id)}>Delete</button>
          </div>
        );
      })}
    </div>
  );
};

const Games = ({
  games,
  handleDeleteGame,
}: {
  games: Game[];
  handleDeleteGame: (id: string) => void;
}) => {
  return (
    <div>
      <h1>Games</h1>
      {games.map((game) => {
        return (
          <div key={game._id} className="flex gap-3">
            <h1>{game._id}</h1>
            <button onClick={() => handleDeleteGame(game._id)}>Delete</button>
          </div>
        );
      })}
    </div>
  );
};

const Chat = ({
  chat,
  handleDeleteMessage,
  searchMessage,
}: {
  chat: Chat[];
  handleDeleteMessage: (id: string) => void;
  searchMessage: (id: string) => void;
}) => {
  return (
    <div>
      <h1>Chat</h1>
      <div>
        <input
          className="input input-primary"
          type="text"
          onChange={(e) => searchMessage(e.target.value)}
        />
      </div>
      {chat.map((message) => {
        return (
          <div key={message._id} className="flex gap-3">
            <h1>{message.username}</h1>
            <h1>{message.message}</h1>
            <button onClick={() => handleDeleteMessage(message.id)}>
              Delete
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Admin;
