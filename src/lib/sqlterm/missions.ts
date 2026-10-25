// Guided SQL games. Each mission seeds its own database; each task is solved either by
// returning the same result as `expect` (a reference query) or by leaving the database in a
// state where `verify` (a query returning 1/0) is true.

import type { SqlValue, Step, Workspace } from "./workspace";

export interface Task {
  ask: string;
  hint: string;
  solution: string;
  /** reference query: the visitor's last SELECT must return the same result */
  expect?: string;
  /** with `expect`: row order matters */
  ordered?: boolean;
  /** query returning a truthy first cell once the database is in the right state */
  verify?: string;
}

export interface Mission {
  id: number;
  db: string;
  title: string;
  blurb: string;
  seed: string;
  tasks: Task[];
  outro: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 1,
    db: "kitchen",
    title: "Cloud Kitchen",
    blurb: "A food-delivery startup dumped its orders into one table. Learn to ask it questions.",
    seed: `
      CREATE TABLE orders (id INTEGER PRIMARY KEY, item TEXT, amount INTEGER, status TEXT, city TEXT);
      INSERT INTO orders VALUES
        (1,'Paneer Tikka',240,'delivered','Bengaluru'), (2,'Masala Dosa',120,'delivered','Bengaluru'),
        (3,'Veg Biryani',310,'preparing','Bengaluru'),   (4,'Butter Chicken',380,'delivered','Mumbai'),
        (5,'Idli Sambar',90,'cancelled','Chennai'),      (6,'Chole Bhature',150,'delivered','Delhi'),
        (7,'Filter Coffee',60,'delivered','Chennai'),    (8,'Hyderabadi Biryani',420,'preparing','Hyderabad'),
        (9,'Pav Bhaji',130,'delivered','Mumbai'),        (10,'Masala Dosa',120,'cancelled','Mumbai'),
        (11,'Rogan Josh',450,'delivered','Delhi'),       (12,'Vada Pav',50,'delivered','Mumbai');`,
    tasks: [
      {
        ask: "Show every order. (Look at the columns first.)",
        hint: "SELECT * FROM orders;   — the * means “all columns”.",
        solution: "SELECT * FROM orders;",
        expect: "SELECT * FROM orders",
      },
      {
        ask: "Show only the orders whose status is 'delivered'.",
        hint: "Add a WHERE clause:  WHERE status = 'delivered'",
        solution: "SELECT * FROM orders WHERE status = 'delivered';",
        expect: "SELECT * FROM orders WHERE status = 'delivered'",
      },
      {
        ask: "The 3 most expensive orders: just item and amount, biggest first.",
        hint: "ORDER BY amount DESC LIMIT 3",
        solution: "SELECT item, amount FROM orders ORDER BY amount DESC LIMIT 3;",
        expect: "SELECT item, amount FROM orders ORDER BY amount DESC LIMIT 3",
        ordered: true,
      },
      {
        ask: "How many orders came from Bengaluru? (One number.)",
        hint: "COUNT(*) counts rows:  SELECT COUNT(*) FROM orders WHERE city = ...",
        solution: "SELECT COUNT(*) FROM orders WHERE city = 'Bengaluru';",
        expect: "SELECT COUNT(*) FROM orders WHERE city = 'Bengaluru'",
      },
      {
        ask: "Revenue per city: two columns (city, total), highest total first.",
        hint: "SELECT city, SUM(amount) AS total ... GROUP BY city ORDER BY total DESC",
        solution: "SELECT city, SUM(amount) AS total FROM orders GROUP BY city ORDER BY total DESC;",
        expect: "SELECT city, SUM(amount) FROM orders GROUP BY city ORDER BY SUM(amount) DESC",
        ordered: true,
      },
    ],
    outro: "You can filter, sort, count and group. That is 80% of everyday SQL.",
  },
  {
    id: 2,
    db: "shop",
    title: "Join the Dots",
    blurb: "Customers, products and orders live in three tables. Stitch them together with JOIN.",
    seed: `
      CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT);
      CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price INTEGER);
      CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id),
                           product_id INTEGER REFERENCES products(id), qty INTEGER);
      INSERT INTO customers VALUES (1,'Asha','Mumbai'),(2,'Ravi','Delhi'),(3,'Meera','Mumbai'),(4,'Kabir','Pune'),(5,'Zoya','Delhi');
      INSERT INTO products VALUES (1,'Keyboard',1500),(2,'Mouse',600),(3,'Monitor',9000),(4,'USB Hub',800);
      INSERT INTO orders VALUES (1,1,1,1),(2,1,2,2),(3,2,3,1),(4,3,2,3),(5,3,4,2),(6,1,4,1),(7,5,1,2),(8,2,2,1);`,
    tasks: [
      {
        ask: "Names of the customers who live in Mumbai. (One column.)",
        hint: "SELECT name FROM customers WHERE city = 'Mumbai';",
        solution: "SELECT name FROM customers WHERE city = 'Mumbai';",
        expect: "SELECT name FROM customers WHERE city = 'Mumbai'",
      },
      {
        ask: "For every order: the customer's name and the product's name. (Two columns, 8 rows.)",
        hint: "orders.customer_id points at customers.id, orders.product_id at products.id:\nFROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id",
        solution:
          "SELECT c.name, p.name FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id;",
        expect:
          "SELECT c.name, p.name FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id",
      },
      {
        ask: "Revenue per customer (qty × price): name and revenue, biggest first.",
        hint: "Join all three tables, then SUM(o.qty * p.price) ... GROUP BY c.id ORDER BY ... DESC",
        solution:
          "SELECT c.name, SUM(o.qty * p.price) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id GROUP BY c.id ORDER BY revenue DESC;",
        expect:
          "SELECT c.name, SUM(o.qty * p.price) FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id GROUP BY c.id ORDER BY SUM(o.qty * p.price) DESC",
        ordered: true,
      },
      {
        ask: "Which customers have never ordered anything? (Names only.)",
        hint: "LEFT JOIN orders and keep the rows where the order side IS NULL — or use NOT IN (SELECT customer_id FROM orders).",
        solution:
          "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;",
        expect: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL",
      },
      {
        ask: "Products with more than 2 units sold in total: product name and units.",
        hint: "GROUP BY the product, then filter the groups with HAVING SUM(o.qty) > 2 (WHERE can't see aggregates).",
        solution:
          "SELECT p.name, SUM(o.qty) AS units FROM orders o JOIN products p ON p.id = o.product_id GROUP BY p.id HAVING SUM(o.qty) > 2;",
        expect:
          "SELECT p.name, SUM(o.qty) FROM orders o JOIN products p ON p.id = o.product_id GROUP BY p.id HAVING SUM(o.qty) > 2",
      },
    ],
    outro: "JOIN + GROUP BY + HAVING: you can now answer questions that span tables.",
  },
  {
    id: 3,
    db: "incident",
    title: "Who Broke Prod?",
    blurb: "03:00 a.m., checkout is down for everyone. Use the deploy log to find the engineer behind it.",
    seed: `
      CREATE TABLE engineers (id INTEGER PRIMARY KEY, name TEXT, team TEXT);
      CREATE TABLE incidents (id INTEGER PRIMARY KEY, service TEXT, started_at TEXT, severity INTEGER, title TEXT);
      CREATE TABLE deploys (id INTEGER PRIMARY KEY, service TEXT, engineer_id INTEGER REFERENCES engineers(id),
                            deployed_at TEXT, sha TEXT);
      INSERT INTO engineers VALUES (1,'Priya','payments'),(2,'Arjun','checkout'),(3,'Neha','platform'),(4,'Dev','checkout'),(5,'Tara','search');
      INSERT INTO incidents VALUES
        (1,'search','2026-03-12 11:05:00',3,'Slow autocomplete'),
        (2,'checkout','2026-03-14 02:14:00',1,'Checkout returns 500 for every cart'),
        (3,'payments','2026-03-14 09:40:00',2,'Delayed settlement emails');
      INSERT INTO deploys VALUES
        (1,'checkout',4,'2026-03-13 16:20:00','a41c0de'),
        (2,'search',5,'2026-03-14 00:30:00','5be91f2'),
        (3,'checkout',2,'2026-03-14 01:05:00','c0ffee1'),
        (4,'payments',1,'2026-03-14 02:09:00','9d8e7f6'),
        (5,'checkout',4,'2026-03-14 01:58:00','badc0de'),
        (6,'platform',3,'2026-03-14 02:20:00','1337abc'),
        (7,'checkout',2,'2026-03-14 02:30:00','f00dfee');`,
    tasks: [
      {
        ask: "Find the severity-1 incident. Show its service and started_at.",
        hint: "SELECT service, started_at FROM incidents WHERE severity = 1;",
        solution: "SELECT service, started_at FROM incidents WHERE severity = 1;",
        expect: "SELECT service, started_at FROM incidents WHERE severity = 1",
      },
      {
        ask: "List every deploy of that service on 2026-03-14: id, deployed_at, engineer_id, oldest first.",
        hint: "WHERE service = 'checkout' AND date(deployed_at) = '2026-03-14' ORDER BY deployed_at",
        solution:
          "SELECT id, deployed_at, engineer_id FROM deploys WHERE service = 'checkout' AND date(deployed_at) = '2026-03-14' ORDER BY deployed_at;",
        expect:
          "SELECT id, deployed_at, engineer_id FROM deploys WHERE service = 'checkout' AND date(deployed_at) = '2026-03-14' ORDER BY deployed_at",
        ordered: true,
      },
      {
        ask: "Same deploys, but show the engineer's name instead of the id: name and deployed_at, oldest first.",
        hint: "JOIN engineers e ON e.id = d.engineer_id",
        solution:
          "SELECT e.name, d.deployed_at FROM deploys d JOIN engineers e ON e.id = d.engineer_id WHERE d.service = 'checkout' AND date(d.deployed_at) = '2026-03-14' ORDER BY d.deployed_at;",
        expect:
          "SELECT e.name, d.deployed_at FROM deploys d JOIN engineers e ON e.id = d.engineer_id WHERE d.service = 'checkout' AND date(d.deployed_at) = '2026-03-14' ORDER BY d.deployed_at",
        ordered: true,
      },
      {
        ask: "The verdict: who deployed that service in the 30 minutes before the incident started? Return just the name.",
        hint: "Join deploys → engineers and deploys → incidents on service, with severity = 1 and\nd.deployed_at BETWEEN datetime(i.started_at, '-30 minutes') AND i.started_at",
        solution:
          "SELECT e.name FROM deploys d JOIN engineers e ON e.id = d.engineer_id JOIN incidents i ON i.service = d.service WHERE i.severity = 1 AND d.deployed_at BETWEEN datetime(i.started_at, '-30 minutes') AND i.started_at;",
        expect:
          "SELECT e.name FROM deploys d JOIN engineers e ON e.id = d.engineer_id JOIN incidents i ON i.service = d.service WHERE i.severity = 1 AND d.deployed_at BETWEEN datetime(i.started_at, '-30 minutes') AND i.started_at",
      },
    ],
    outro: "Dev shipped badc0de at 01:58. Blameless postmortem: add a canary stage, not a scapegoat.",
  },
  {
    id: 4,
    db: "library",
    title: "Build It Yourself",
    blurb: "An empty database. Create a table, then fill it, fix it and prune it.",
    seed: "",
    tasks: [
      {
        ask: "Create a table `books` with the columns id (INTEGER PRIMARY KEY), title (TEXT), author (TEXT) and year (INTEGER).",
        hint: "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, ... );",
        solution: "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author TEXT, year INTEGER);",
        verify: "SELECT COUNT(*) = 4 FROM pragma_table_info('books') WHERE name IN ('id','title','author','year')",
      },
      {
        ask: "Insert at least 3 books — make at least one of them older than 1950.",
        hint: "INSERT INTO books (title, author, year) VALUES ('Emma', 'Jane Austen', 1815), (...), (...);",
        solution:
          "INSERT INTO books (title, author, year) VALUES ('Emma','Jane Austen',1815), ('Neuromancer','William Gibson',1984), ('Kindred','Octavia Butler',1979);",
        verify: "SELECT (SELECT COUNT(*) FROM books) >= 3 AND (SELECT COUNT(*) FROM books WHERE year < 1950) >= 1",
      },
      {
        ask: "The intern added Dune by Frank Herbert with the wrong year. Insert it as year 1960.",
        hint: "INSERT INTO books (title, author, year) VALUES ('Dune', 'Frank Herbert', 1960);",
        solution: "INSERT INTO books (title, author, year) VALUES ('Dune', 'Frank Herbert', 1960);",
        verify: "SELECT COUNT(*) >= 1 FROM books WHERE title = 'Dune' AND author = 'Frank Herbert' AND year = 1960",
      },
      {
        ask: "Fix it: UPDATE the year of Dune to 1965.",
        hint: "UPDATE books SET year = 1965 WHERE title = 'Dune';   — never forget the WHERE.",
        solution: "UPDATE books SET year = 1965 WHERE title = 'Dune';",
        verify: "SELECT (SELECT COUNT(*) FROM books WHERE title = 'Dune' AND year = 1965) >= 1 AND (SELECT COUNT(*) FROM books WHERE title = 'Dune' AND year = 1960) = 0",
      },
      {
        ask: "Delete every book published before 1950 (and keep Dune).",
        hint: "DELETE FROM books WHERE year < 1950;",
        solution: "DELETE FROM books WHERE year < 1950;",
        verify: "SELECT (SELECT COUNT(*) FROM books WHERE year < 1950) = 0 AND (SELECT COUNT(*) FROM books WHERE title = 'Dune') >= 1",
      },
    ],
    outro: "CREATE, INSERT, UPDATE, DELETE: you just ran a full CRUD lifecycle.",
  },
];

const norm = (v: SqlValue) => (v === null ? "NULL" : v instanceof Uint8Array ? "<blob>" : typeof v === "number" ? String(Math.round(v * 1e6) / 1e6) : v);

/** null = the visitor's step has nothing to judge; otherwise solved or a note on what's off */
export function checkTask(task: Task, ws: Workspace, steps: Step[]): { ok: boolean; note?: string } | null {
  if (task.verify) {
    const v = ws.query(task.verify);
    if (v.kind === "rows" && v.rows[0]?.[0]) return { ok: true };
    return steps.some((s) => s.out.kind === "ok") ? { ok: false, note: "Not there yet — re-read the task, or type hint." } : null;
  }
  const mine = [...steps].reverse().find((s) => s.out.kind === "rows")?.out;
  const want = ws.query(task.expect!);
  if (mine?.kind !== "rows" || want.kind !== "rows") return null;
  if (mine.columns.length !== want.columns.length)
    return { ok: false, note: `Your query returns ${mine.columns.length} column(s); the task wants ${want.columns.length}.` };
  if (mine.rows.length !== want.rows.length)
    return { ok: false, note: `Your query returned ${mine.rows.length} row(s); the task expects ${want.rows.length}.` };
  const key = (rows: SqlValue[][]) => rows.map((r) => JSON.stringify(r.map(norm)));
  const a = key(mine.rows);
  const b = key(want.rows);
  if (a.join("\n") === b.join("\n")) return { ok: true };
  if (a.sort().join("\n") !== b.sort().join("\n")) return { ok: false, note: "Right number of rows, but some values differ." };
  return task.ordered ? { ok: false, note: "Right rows, wrong order — check your ORDER BY." } : { ok: true };
}

const PROGRESS_KEY = "sambit.sqlterm.progress.v1";

/** mission id → index of the task the visitor is on (== tasks.length when finished) */
export function loadProgress(): Record<number, number> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveProgress(p: Record<number, number>) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* progress just won't survive a reload */
  }
}
