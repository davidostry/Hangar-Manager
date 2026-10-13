"""Fluent, in-memory Supabase query spy; never accesses any network."""
from types import SimpleNamespace


class QuerySpy:
    def __init__(self, name, rows, calls):
        self.name = name
        self.rows = rows
        self.calls = calls

    def _record(self, operation, *args):
        self.calls.append((self.name, operation, *args))
        return self

    def select(self, fields):
        return self._record("select", fields)

    def eq(self, column, value):
        return self._record("eq", column, value)

    def in_(self, column, values):
        return self._record("in_", column, values)

    def order(self, column):
        return self._record("order", column)

    def range(self, start, end):
        return self._record("range", start, end)

    def insert(self, values):
        return self._record("insert", values)

    def update(self, values):
        return self._record("update", values)

    def delete(self):
        return self._record("delete")

    def execute(self):
        self.calls.append((self.name, "execute"))
        return SimpleNamespace(data=self.rows)


class SupabaseSpy:
    def __init__(self, **data):
        self.data = data
        self.calls = []

    def table(self, table_name):
        self.calls.append((table_name, "table"))
        return QuerySpy(table_name, self.data.get(table_name, []), self.calls)

    def operations(self, name, operation):
        return [call for call in self.calls if call[:2] == (name, operation)]
