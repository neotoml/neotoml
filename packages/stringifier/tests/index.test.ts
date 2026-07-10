import { describe, test, expect } from "bun:test";

import { stringify } from "../src";

describe("stringify", () => {
  test("stringify a simple object", () => {
    expect(
      stringify({
        clients: {
          data: [
            ["gamma", "delta"],
            [1, 2],
          ],
          hosts: ["alpha", "omega"],
        },
        database: {
          connection_max: 5000,
          enabled: true,
          ports: [8001, 8001, 8002],
          server: "192.168.1.1",
        },
        owner: {
          dob: new Date("1979-05-27T07:32:00.000-08:00"),
          name: "Lance Uppercut",
        },
        servers: {
          alpha: {
            dc: "eqdc10",
            ip: "10.0.0.1",
          },
          beta: {
            dc: "eqdc10",
            ip: "10.0.0.2",
          },
        },
        title: "TOML Example",
      }),
    ).toBe(`title = "TOML Example"

[clients]
data = [ [ "gamma", "delta" ], [ 1, 2 ] ]
hosts = [ "alpha", "omega" ]

[database]
connection_max = 5000
enabled = true
ports = [ 8001, 8001, 8002 ]
server = "192.168.1.1"

[owner]
dob = 1979-05-27T15:32:00.000Z
name = "Lance Uppercut"

[servers.alpha]
dc = "eqdc10"
ip = "10.0.0.1"

[servers.beta]
dc = "eqdc10"
ip = "10.0.0.2"
`);
  });
});
