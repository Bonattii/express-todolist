require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 3000;

// Config app to use EJS
app.set('view engine', 'ejs');

// Allow the req.body to be used
app.use(bodyParser.urlencoded({ extended: true }));

// Allow the server to run static files
app.use(express.static('public'));

// Create a mongoDB DB called todolistDB
mongoose.connect(process.env.MONGO_URI);

// Create a Schema for the items
const itemsSchema = {
  name: {
    type: String,
    require: [true, 'Activities needs to have a Name!']
  }
};

// Moongose convert Item into items automatically
const Item = mongoose.model('Item', itemsSchema);

// Create 3 new elements to the db
const item1 = new Item({
  name: 'Welcome to your todolist!'
});

const item2 = new Item({
  name: 'Hit the + button to add a new item.'
});

const item3 = new Item({
  name: '<-- Hit this to delete an item.>'
});

const defaultItems = [item1, item2, item3];

// Schema with the itemsSchema relationship
const listSchema = {
  name: {
    type: String,
    require: [true, 'Need to have a name!']
  },
  items: [itemsSchema]
};

// Moongose convert List into lists automatically
const List = mongoose.model('List', listSchema);

app.get('/', (req, res) => {
  Item.find({}, (err, items) => {
    // Check if have any items b4 insert to the db
    if (items.length === 0) {
      // Insert the items to the db
      Item.insertMany(defaultItems, err =>
        err ? console.log(err) : console.log('Success!')
      );

      res.redirect('/');
    } else {
      res.render('list', { listTitle: 'Today', items });
    }
  });
});

app.get('/:customListName', (req, res) => {
  const customListNameParam = _.capitalize(req.params.customListName);

  List.findOne({ name: customListNameParam }, (err, foundList) => {
    if (!err) {
      // If the list doesn't exists yet
      if (!foundList) {
        // Create a new list with the defaultItems array as a start
        const list = new List({
          name: customListNameParam,
          items: defaultItems
        });

        list.save();

        res.redirect(`/${customListNameParam}`);
      } else {
        // If the list alerady exists just simply render a page with the items
        res.render('list', {
          listTitle: foundList.name,
          items: foundList.items
        });
      }
    }
  });
});

app.post('/', (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  // Create a new element for the db
  const newItem = new Item({
    name: itemName
  });

  // Check if we are at a custom list or on the default one
  if (listName === 'Today') {
    newItem.save();
    res.redirect('/');
  } else {
    // Add an item to the list and redirect to the correct page
    List.findOne({ name: listName }, (err, foundList) => {
      foundList.items.push(newItem);
      foundList.save();
      res.redirect(`/${listName}`);
    });
  }
});

app.post('/delete', (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  // Check if we are at a custom list or on the default one
  if (listName === 'Today') {
    // Delete the record from the database
    Item.findByIdAndDelete(checkedItemId, err => {
      err ? console.log(err) : res.redirect('/');
    });
  } else {
    // Check on the list for an item insied the items array with the id and pull out
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } },
      (err, foundList) => {
        if (!err) res.redirect(`/${listName}`);
      }
    );
  }
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.listen(PORT, () => console.log('Server started on port 3000'));
