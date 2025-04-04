
class MySQLQueryBuilder {
    constructor() {
        this.query = {
            select: '*',
            from: '',
            where: [],
            join: [],
            groupBy: [],
            having: [],
            orderBy: [],
            limit: null,
            offset: null,
            insert: null,
            update: null,
            delete: false
        };
        this.params = [];
    }

    // Установка таблицы для SELECT, INSERT, UPDATE
    table(tableName) {
        this.query.from = tableName;
        return this;
    }

    // Установка SELECT полей
    select(fields = '*') {
        this.query.select = fields;
        return this;
    }

    // Установка условий WHERE
    where(condition, values) {
        this.query.where.push({ condition, values });
        this.params.push(...values);
        return this;
    }

    andWhere(condition, values) {
        // Добавляем условие с AND
        this.query.where.push({ condition: `AND ${condition}`, values });
        this.params.push(...values); // Добавляем параметры в массив this.params
        return this;
    }

    orWhere(condition, values) {
        // Добавляем условие с OR
        this.query.where.push({ condition: `OR ${condition}`, values });
        this.params.push(...values); // Добавляем параметры в массив this.params
        return this;
    }


    // Метод для оператора IN
    whereIn(column, values) {
        // Создаем условие с IN
        const placeholders = values.map(() => '?').join(', '); // Генерация подстановок для каждого значения
        const condition = `${column} IN (${placeholders})`;

        // Добавляем условие и параметры в запрос
        this.query.where.push({ condition, values });
        this.params.push(...values); // Добавляем параметры
        return this;
    }

    // Установка JOIN
    join(type, table, onCondition) {
        this.query.join.push({ type, table, onCondition });
        return this;
    }

    // Установка GROUP BY
    groupBy(fields) {
        this.query.groupBy.push(fields);
        return this;
    }

    // Установка HAVING
    having(condition, values) {
        this.query.having.push({ condition, values });
        return this;
    }

    // Установка ORDER BY
    orderBy(field, direction = 'ASC') {
        this.query.orderBy.push({ field, direction });
        return this;
    }

    // Установка LIMIT
    limit(count) {
        this.query.limit = count;
        return this;
    }

    // Установка OFFSET
    offset(count) {
        this.query.offset = count;
        return this;
    }

    // Для вставки данных (INSERT)
    insert(data) {
        this.query.insert = data;
        return this;
    }

    // Для обновления данных (UPDATE)
    update(data) {
        this.query.update = data;
        return this;
    }

    // Для удаления данных (DELETE)
    delete() {
        this.query.delete = true;
        return this;
    }

    // Компиляция запроса в строку SQL
    build() {
        let sql = '';

        if (this.query.select && this.query.from) {
            sql += `SELECT ${this.query.select} FROM ${this.query.from} `;
        }

        // Добавляем JOIN
        if (this.query.join.length) {
            this.query.join.forEach(join => {
                sql += `${join.type} JOIN ${join.table} ON ${join.onCondition} `;
            });
        }

        // Добавляем WHERE
        if (this.query.where.length) {
            sql += 'WHERE ' + this.query.where.map(w => w.condition).join(' AND ') + ' ';
        }

        // Добавляем GROUP BY
        if (this.query.groupBy.length) {
            sql += 'GROUP BY ' + this.query.groupBy.join(', ') + ' ';
        }

        // Добавляем HAVING
        if (this.query.having.length) {
            sql += 'HAVING ' + this.query.having.map(h => h.condition).join(' AND ') + ' ';
        }

        // Добавляем ORDER BY
        if (this.query.orderBy.length) {
            sql += 'ORDER BY ' + this.query.orderBy.map(o => `${o.field} ${o.direction}`).join(', ') + ' ';
        }

        // Добавляем LIMIT и OFFSET
        if (this.query.limit !== null) {
            sql += `LIMIT ${this.query.limit} `;
        }

        if (this.query.offset !== null) {
            sql += `OFFSET ${this.query.offset} `;
        }

        // Для операций INSERT, UPDATE, DELETE
        if (this.query.insert) {
            const columns = Object.keys(this.query.insert).join(', ');
            const values = Object.values(this.query.insert).map(v => `'${v}'`).join(', ');
            sql = `INSERT INTO ${this.query.from} (${columns}) VALUES (${values})`;
        }

        if (this.query.update) {
            const setClause = Object.keys(this.query.update).map(key => `${key} = '${this.query.update[key]}'`).join(', ');
            sql = `UPDATE ${this.query.from} SET ${setClause}`;
        }

        if (this.query.delete) {
            sql = `DELETE FROM ${this.query.from}`;
        }


        return {
            query: sql.trim(),  // сам запрос
            params: this.params  // параметры для запроса
        };
    }
}

module.exports = MySQLQueryBuilder;
