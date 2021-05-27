const express = require('express');
const path = require('path');
const logger = require('morgan');
const neo4j = require('neo4j-driver');
const env = require('dotenv');

env.config();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'password'));

app.get('/', async (req, res) => {
    const session = driver.session();
    const movies = [];
    const actors = [];

    const tx = session.beginTransaction();

    await tx
        .run('MATCH(n:Movie) Return n LIMIT 25')
        .then((result) => {
            result.records.forEach((movie) => {
                movies.push(
                    {
                        id: movie._fields[0].identity.low,
                        title: movie._fields[0].properties.title,
                        year: movie._fields[0].properties.year
                    }
                );

            })
        })
        .catch((error) => {
            console.log(error);
        });

    await tx
        .run('MATCH(n:Actor) Return n LIMIT 25')
        .then((result) => {
            result.records.forEach((actor) => {
                actors.push(
                    {
                        id: actor._fields[0].identity.low,
                        name: actor._fields[0].properties.name,
                    }
                );
            })
        })
        .catch((error) => {
            console.log(error);
        });

    await tx.commit();
    session.close();

    res.render('index.ejs', {
        movies: movies,
        actors: actors
    });
});

app.post('/movie/add', (req, res) => {
    const title = req.body.title;
    const year = req.body.year;
    const session = driver.session();

    session
        .run('CREATE(n:Movie {title: $title, year: $year}) RETURN n', { title: title, year: year })
        .then((result) => {
            session.close();
            res.redirect('/');
        })
        .catch((error) => {
            console.log(error);
            session.close();
            res.redirect('/');
        });
});

app.post('/actor/add', (req, res) => {
    const name = req.body.name;
    const session = driver.session();

    session
        .run('CREATE(n:Actor {name: $name}) RETURN n', { name: name })
        .then((result) => {
            session.close();
            res.redirect('/');
        })
        .catch((error) => {
            console.log(error);
            session.close();
            res.redirect('/');
        });
});

app.post('/movie/actor/add', (req, res) => {
    const title = req.body.title;
    const name = req.body.name;
    const session = driver.session();

    session
        .run('MATCH(a:Actor {name: $name}), (m:Movie {title: $title}) MERGE(a)-[r:ACTED_IN]-(m) RETURN a,m', { title: title, name: name })
        .then((result) => {
            session.close();
            res.redirect('/');
        })
        .catch((error) => {
            console.log(error);
            session.close();
            res.redirect('/');
        });
});

app.listen(3000);
console.log("App listening on port 3000");

module.exports = app;