class Table extends HTMLElement{
  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'open' })
    this._template()
    this._initialize()
  }

  _initialize() {
    this.data = []
    this.columns = []
    this.needsPagination = false
    this.table = this.shadowRoot.querySelector("#table")
  }

  _template() {
    this.shadowRoot.innerHTML = `
      <style>
      #table{position:relative;background-color: #d0ffd6;padding:2em 1em 2.5em;}
      h2{position:absolute;top:-.5em;color: #474747;max-width:100%;}
      .legend { border: 1px solid #DCDCDC; text-align: right; padding: 3px; border-radius: 5px; margin: 10px 0px; background-color: #474747; color: #fff;}
      .legend label { margin-right: 10px; }

      table { max-width: 100%; clear: both; margin: 0px; background-color: #fff;}
      table thead {background: #EEE;}
      table th { text-align: left; padding: 5px 10px; }
      table td { padding: 5px 10px; border: 1px solid #DCDCDC; border-top:none; background-color: #fff; }

      .main-container .sortable { padding-right: 20px; background: url(images/arrow-sortable.png) no-repeat center right; }
      .main-container .sort-asc { background: url(images/arrow-up.png) no-repeat center right; }
      .main-container .sort-desc { background: url(images/arrow-down.png) no-repeat center right; }

      .paging { position:absolute; bottom:.5em; padding:3px 1em; border-radius: 5px; text-align: center; text-align:center; background-color: #474747; color: #fff;}
      .paging .page-link { text-decoration: none; padding:0px 5px; margin:2px; background-color: #fff; color: #000;}
      </style>
      <div id="table">
        <h2></h2>
      </div>
    `
  }

  connectedCallback() {
    this.pagination = this.getAttribute('pagination')
    this.data = JSON.parse(this.getAttribute('alldata'))
    this.columns = this._prepareColumns()
    this.shadowRoot.querySelector('h2').textContent = this.getAttribute('title')
    this.createTable()
    this._checkMainContainerOverflow()
    window.addEventListener("orientationchange", function() {
    	this._checkMainContainerOverflow()
    }, false);
  }

  createTable() {
      let container = this._createContainer()
      let table = document.createElement('table')
      let thead = this._createThead()
      table.append(thead);
      let tbody = this._createTbody()
      table.append(tbody);
      container.append(table);
      this._createPagination(container)
      this.table.append(container);
  };


  _toggleColumns(event){
    let columnIndex = event.target.dataset.index;
    if (event.target.checked) {
        this._showColumns(columnIndex)
    } else {
        this._hideColumns(columnIndex)
    }
    this._checkMainContainerOverflow()
  }

  _showColumns(columnIndex) {
    this.shadowRoot.querySelectorAll("td[data-index='" + columnIndex + "']").forEach(function(element){
      element.style.display = 'table-cell';
    })
    this.shadowRoot.querySelector("th[data-index='" + columnIndex + "']").style.display = 'table-cell'
  }

  _hideColumns(columnIndex) {
    this.shadowRoot.querySelectorAll("td[data-index='" + columnIndex + "']").forEach(function(element){
      element.style.display = 'none';
    })
    this.shadowRoot.querySelector("th[data-index='" + columnIndex + "']").style.display = 'none'
  }

  _showOnlyPageClickedRows(event) {
    var page = event.target.dataset.index

    this.shadowRoot.querySelectorAll("tbody tr").forEach(function (tr_item,tr_index) {
        tr_item.style.display='none'

        var pageStart = ((page - 1) * this.pagination) + 1;
        var pageEnd = page * this.pagination;

        if ((tr_index + 1) >= pageStart && (tr_index + 1) <= pageEnd) {
            tr_item.style.display='table-row'
        }
    }.bind(this));
  }

  _onSortClick(event) {
    let container = this.shadowRoot.querySelector(".main-container");
    let last_direction = container.dataset.direction;
    let type = event.target.dataset.type
    let columnIndex = event.target.dataset.index

    this._setDirectionClass(event.target, last_direction)

    let array = this._prepareRowForSortingByColumn(type, columnIndex)

    if (last_direction == "ASC") {
      array = this._sortDesc(array)
      container.dataset.direction= "DESC"
    } else {
      array = this._sortAsc(array)
      container.dataset.direction= "ASC"
    }

    this._updateRowsDirection(array)
    this._goesToFirstPage(container)
  }

  _sortDesc(array) {
    array.sort(function (a, b) {
        if (a.value > b.value) { return 1 }
        if (a.value < b.value) { return -1 }
        return 0;
    })
    return array
  }

  _sortAsc(array) {
    array.sort(function (a, b) {
        if (a.value < b.value) { return 1 }
        if (a.value > b.value) { return -1 }
        return 0;
    })
    return array
  }

  _updateRowsDirection(array) {
    for (var i = 0; i < array.length; i++) {
      var tr = this.shadowRoot.querySelector('tbody').querySelector("tr[data-index='" + array[i].tr_id + "']")
      tr.parentNode.removeChild(tr);

      this.shadowRoot.querySelector('tbody').append(tr);
    }
  }

  _goesToFirstPage(container) {
    if (container.classList.contains("paged")) {
        this.shadowRoot.querySelectorAll('.page-link')[0].click();
    }
  }

  _prepareRowForSortingByColumn(type, colunmIndex) {
    let rowChanges = [];

    this.shadowRoot.querySelectorAll("tbody tr").forEach(function (tr) {
      let td = tr.querySelectorAll("td")[colunmIndex]
      let tr_id = td.parentNode.dataset.index
      let value = null;

      switch (type) {
          case "string":
              value = td.textContent
              break;
          case "int":
              value = parseInt(td.textContent)
              break;

          case "float":
              value = parseFloat(td.textContent)
              break;

          case "datetime":
              value = new Date(td.textContent)
              break;

          default:
              value = td.textContent
              break;
      }

      rowChanges.push({ tr_id: tr_id, value: value })
    }.bind(this))

    return rowChanges
  }

  _setDirectionClass(element, direction) {
    this.shadowRoot.querySelectorAll('.sortable').forEach(function(item){
      item.classList.remove("sort-asc", "sort-desc")
    }.bind(this));
    element.classList.add("sort-" + direction.toLowerCase());
  }

  _prepareColumns() {
    let headings = this._prepareItems(this.getAttribute('headings'))
    let fields = this._prepareItems(this.getAttribute('fields'))
    let types = this._prepareItems(this.getAttribute('types'))
    let hiddens = this._prepareItems(this.getAttribute('hiddens'))

    return this._fillArrayOfColumns(headings, fields, types, hiddens)
  }

  _fillArrayOfColumns(headings, fields, types, hiddens) {
    let columns = []
    for(let i = 0 ; i < headings.length ; i++ ){
      let column = {
        heading: headings[i],
        field: fields[i],
        type: types[i],
        sortable: this._is_valid_field(types[i]),
        starthidden: hiddens[i]
      }
      columns.push(column)
    }

    return columns
  }

  _prepareItems(data){
    return JSON.parse(data)
  }

  _is_valid_field(field){
    let validFields = ["string", "int", "float", "datetime"]
    return validFields.includes(field);
  }

  _createThead() {
    let thead = document.createElement('thead');
    let legend = this._createElementWithClass('div', 'legend')
    let theadRow = document.createElement('tr');

    this.columns.forEach(function (item,index) {
        let th = document.createElement('th')
        th.dataset.index= index;

        let legendItem = this._createLegendItem(item, index)
        legend.append(legendItem)
        let legendItemLabel = this._createLegendItemLabel(item, index)
        legend.append(legendItemLabel)

        this._checkIfStartHidden(item.starthidden, th)
        this._addHeadingContent(item, index, th)
        theadRow.append(th);
    }.bind(this));

    thead.append(theadRow);
    this.table.append(legend)

    return thead
  }

  _addHeadingContent(item, index, heading) {
    if (item.sortable) {
        let itemSortable = this._createSortableItem(item,index)
        heading.append(itemSortable)
    } else {
        let span = this._createElementWithText('span', item.heading)
        heading.append(span);
    }
  }

  _createTbody() {
    let tbody = document.createElement('tbody')

    this.data.forEach(function (item,index) {
        let row = this._createRow(index)
        this._hideRowIfNeeded(row, index)
        this._fillRow(row, item)
        tbody.append(row);
    }.bind(this));

    return tbody
  }

  _createPagination(container) {
    if (this.needsPagination) {
      let pager = this._createElementWithClass('div', 'paging')
      for (var i = 0; i < this._pagesNumber() ; i++) {
          let a = this._createPageLink(i)
          pager.append(a)
      }
      container.append(pager)
      container.classList.add("paged");
    }
  }

  _pagesNumber(){
    return Math.ceil(this.data.length / this.pagination)
  }

  _fillRow(row, item) {
    this.columns.forEach(function(td_item,td_index) {
      let td = this._createElementWithText('td', item[td_item.field])
      td.dataset.index= td_index
      this._checkIfStartHidden(td_item.starthidden, td)
      row.append(td)
    }.bind(this));
  }

  _createContainer() {
    let container = document.createElement('div')
    container.dataset.direction = "ASC"
    this._addClassTo(container, "main-container")

    return container
  }

  _createLegendItem(item, index) {
    var input = document.createElement('input')
    input.id = "legend-input-" + index
    input.type = "checkbox"
    input.value = index
    input.checked = !item.starthidden
    input.dataset.index = index;
    input.addEventListener("change", this._toggleColumns.bind(this))

    return input
  }

  _createLegendItemLabel(item, index) {
    let legendItemLabel = this._createElementWithText('label', item.heading)
    legendItemLabel.for= 'legend-item-' + index

    return legendItemLabel
  }

  _createSortableItem(item,index) {
    let itemSortable = this._createElementWithText('span', item.heading)
    itemSortable.classList.add("sortable")
    itemSortable.dataset.index= index;
    itemSortable.dataset.type = item.type
    itemSortable.addEventListener("click", this._onSortClick.bind(this))

    return itemSortable
  }

  _createElementWithClass(element, className){
    var item = document.createElement(element)
    this._addClassTo(item, className)

    return item
  }

  _createElementWithText(element, text) {
    let item = document.createElement(element)
    item.textContent = text

    return item
  }

  _createPageLink(index) {
    let a = document.createElement("a")
    a.textContent = (index + 1)
    a.href= "#"
    a.dataset.index= (index + 1)
    a.classList.add("page-link")
    a.addEventListener("click", this._showOnlyPageClickedRows.bind(this))

    return a
  }

  _createRow(index) {
    let tr = document.createElement("tr")
    tr.dataset.index= index;

    return tr
  }


  _checkIfStartHidden(starthidden, element){
    if (starthidden){ element.style.display = 'none' }
  }

  _hideRowIfNeeded(row, index) {
    this.needsPagination = false
    if (this.pagination <= index) {
        row.style.display = 'none';
        this.needsPagination = true;
    }
  }

  _addClassTo(element,className){
    element.classList.add(className)

    return element
  }

  _checkMainContainerOverflow() {
    let mainContainer = this.shadowRoot.querySelector('.main-container')
    if(this._isOverflown(mainContainer)){
      mainContainer.style.overflowX = 'scroll'
    }
  }

  _isOverflown(element) {
    return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
  }

}


customElements.define('wm-table', Table)
