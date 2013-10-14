/**
 * Бредогенератор
 *
 * @version 2.0
 * @date 14.10.2013
 * @author Vladimir Shestakov <boolive@yandex.ru>
 * @use JQuery, chain.js
 * @constructor
 */
var Bred = (function($, Chain, undefined){
    /**
     * Строковое представление объекта для его идентификации
     * @param object
     * @returns {string}
     */
    var hash = function(object){
        if ($.isPlainObject(object)){
            var s = '';
            $.each(object, function(key){
                if (s.length) s += ',';
                s += key + ':' + hash(this);
            });
            return '{' + s + '}';
        }
        return ''+object;
    };
    var escapeHTML = (function () {
        'use strict';
        var chr = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };
        return function (text) {
            return text.replace(/[\"&<>]/g, function (a) { return chr[a]; });
        };
    }());
    /**
     * Узел бреда
     * @param key
     * @param info
     * @param parent
     * @param prev
     * @constructor
     */
    var BredNode = function(key, info, parent, prev){
        /** Информация об узле: имя, атрибуты, значение...*/
        this.info = info || {};
        this.key = hash(info);
        /** Следующие и подчиенные узлы. */
        this.next = [];
        this.children = [];
        /** Ссылки на родителький и предыдущий узел*/
        this.parent = parent;
        this.prev = prev;
        /** Индекс подчиненных узлов для быстрого поиска существующего */
        this.index = {};
    };
    /**
     * Добавление следующего узла
     * Если уже имеется узел с указанной информацией, то добавляется ссылка на него, иначе создаётся новый
     * @param info
     * @returns {*}
     */
    BredNode.prototype.addNext = function(info){
        if (this.parent){
            var key = this.getKey(info);
            if (typeof this.parent.index[key] == 'undefined') this.parent.index[key] = new BredNode(key, info, this.parent, this);
            this.next.push(this.parent.index[key]);
            return this.parent.index[key];
        }
        return this;
    };
    /**
     * Добавление подчиенного узла
     * Если уже имеется узел с указанной информацией, то добавляется ссылка на него, иначе создаётся новый
     * @param info
     * @returns {*}
     */
    BredNode.prototype.addChild = function(info){
        var key = this.getKey(info,0);
        if (typeof this.index[key] == 'undefined') this.index[key] = new BredNode(key, info, this);
        this.children.push(this.index[key]);
        return this.index[key];
    };
    /**
     * Генерация ключа для узла изсходя из его информации и его предыдущих узлов.
     * @param info
     * @param size Кол-во предыдущих узлов (префикс)
     * @returns {*}
     */
    BredNode.prototype.getKey = function(info, size){
        var key = hash(info);
        var prev = this;
        if (typeof size === 'undefined') size = 1;
        while (prev && size-->0){
            if (!prev._key) prev._key = hash(prev.info);
            key+="#"+prev._key;
            prev = prev.prev;
        }
        return key;
    };

    BredNode.prototype.getChild = function(){
        return this.children[Math.round(Math.random()*(this.children.length-1))];
    };

    BredNode.prototype.getNext = function(){
        return this.next[Math.round(Math.random()*(this.next.length-1))];
    };

    /**
     * Является ли узел символом пунктуации?
     * @returns {boolean}
     */
    BredNode.prototype.isPunctuation = function(){
        return this.info.val && /^[.,:!?]+$/.test(this.info.val);
    };

    BredNode.prototype.render = function(max, callbacks, statistic){
        // Тег
        var result = '', contain = '';
        var tag = typeof this.info.name === 'undefined' || this.info.name==='text' ? false : this.info.name;
        var is_single = tag && /^(img|br|hr)$/i.test(tag);
        if (tag) result += '<' + this.info.name;
        if ($.isPlainObject(this.info.attr)){
            $.each(this.info.attr, function(key, val){
                result += ' '+key+'="'+val+'"'
            });
        }
        if (tag) result += is_single ? '/>' : '>';
        // Значение или подчиенные
        if (this.children.length > 0){
//            var cnt = 4;
//            while (--cnt>0){
            var max_child = statistic.getCountsSum(this.info.name)+5;
               contain = this.getChild().render(max_child, callbacks, statistic);
//            }
        }else
        if (this.info.val){
            if (!this.isPunctuation()) result += ' ';
            contain = escapeHTML(this.info.val);
        }
        if ($.isPlainObject(callbacks) && $.isFunction(callbacks[this.key])){
            if (!callbacks[this.key].call(this, contain)){
                contain = '';
            }
        }
        result += contain;
        //Закрываем
        if (tag && !is_single) result += '</' + this.info.name + '> ';
        //Следующий
        if (max>1 && this.next.length > 0){
            result += this.getNext().render(max-1, callbacks, statistic);
        }

        return result;
    };

    /**
     * Генератор бреда
     * @param config Конфигурация бреда - размеры предложений, абзацев, комментов, качества бреда
     * @constructor
     */
    var Bred = function(config){
        this.config = config;
        // Частотный анализ
        this.statistic = {
            group: {},
            frequency: null,
            // Добавление сведений о количестве использований элементов в некой группе
            add: function(group, counted_items){
                if (typeof this.group[group] === 'undefined') this.group[group] = [];
                this.group[group].push(counted_items);
            },
            // Обработка данных для последующей выдачи случайных величин с учётом частот
            init: function(){
                var self = this;
                this.frequency = {};
                $.each(this.group, function(key, value){
                    self.frequency[key] = {};
                    var cnt = 0;
                    $.each(value, function(key2, value2){
                        cnt++;
                        $.each(value2, function(key3, value3){
                            if (typeof self.frequency[key][key3] === 'undefined') self.frequency[key][key3] = {/*0:0*/};
                            if (typeof self.frequency[key][key3][value3] === 'undefined') self.frequency[key][key3][value3] = 0;
                            self.frequency[key][key3][value3]++;
                            //self.frequency[key][key3][0]--;
                        });
                    });

                    $.each(self.frequency[key], function(key2){
                        var m = [], v = 0;
                        //self.frequency[key][key2][0]+=cnt;
                        $.each(self.frequency[key][key2], function(key3, value3){
                            m.push({i:value3 + v, cnt: key3});
                            v+=value3;
                        });
                        self.frequency[key][key2] = m;
                    });
                });
            },
            // Случайное количество для элемента в группе с учётом частот
            randomCount: function(group, item){
                if (!this.frequency) this.init();
                if (typeof this.frequency[group][item] !== 'undefined'){
                    var need =  this.frequency[group][item][this.frequency[group][item].length-1].i;
                    need = Math.round(Math.random()*need);
                    var index = 0, high = this.frequency[group][item].length;
                    while (index < high) {
                        var mid = (index + high) >>> 1;
                        this.frequency[group][item][mid].i < need ? index = mid + 1 : high = mid;
                    }
                    return this.frequency[group][item][index].cnt;
                }
                return 0;
            },
            getCounts: function(group){
                if (typeof this.group[group] !== 'undefined'){
                    return this.group[group][Math.round(Math.random()*(this.group[group].length-1))];
                }
                return {};
            },
            getCountsSum: function(group){
                var sum = 0;
                $.each(this.getCounts(group), function(){
                    sum+=this;
                });
                return sum;
            }
        };
        this.node = new BredNode();
    };

    Bred.prototype.add = function(data){
        this.parse(this.node, data, false, false);
    };

    Bred.prototype.parse = function(c, element, all, make_p){
        var self = this,
            group = element.localName,
            p = document.createElement('p'); // Для восоздания абзацев

        // Особенности для статьи (отдельная обработка комментов)
        //if (group == 'article') this.parse($(element).find('.comments').remove()[0], false, false);

        // Особенности для коментария (обрабатываем только его сообщение)
//            if ($(element).hasClass('comment')){
//                this.users.push($(element).find('.username'));
//                element = $(element).find('.message')[0];
//                make_p = true;
//                group = 'comment';
//            }

        // Для статистики, что в текущем элементе
        //if (typeof this.chains[group] === 'undefined') this.chains[group] = [];

        // Обработка подчиенных узлов (тегов и текстовых)
        var children = all ? $(element).contents() : $(element).children();
        var list = [];
        var counts = {};

        var sub = undefined;
        children.each(function(i, child){
            var tag = Node.ELEMENT_NODE === child.nodeType ? child.localName : 'text';
            // Inline тэги в абзац
            if (make_p && /^(text|i|u|a|b|i|u|strong|em|code|span|font)$/.test(tag)){
                p.appendChild(this);
            }else{
                if (make_p && p.childNodes.length>0){
                    sub = sub ? sub.addNext({name:'p'}) : c.addChild({name:'p'});
                    self.parse(sub, p, true, false);
                    p = document.createElement('p');
                    if (typeof counts['p'] === 'undefined') counts['p'] = 0;
                    counts['p']++;
                }
                if (/^(p|h1|h2|h3|h4|h5|h6|ul|ol|li|pre|blockquote|div|article|section|i|u|a|b|i|u|strong|em|code|span|table|tbody|thead|tr|td|sub|font)$/.test(tag)){
                    var info = {name: tag, attr: {}};
                    $.each(this.attributes, function() {
                        if(this.specified) {
                         info.attr[this.name] = this.value;
                        }
                    });
                    if ($.isEmptyObject(info.attr)) delete info.attr;
                    sub = sub ? sub.addNext(info) : c.addChild(info);
                    self.parse(sub, this, true, tag == 'article');
                    if (typeof counts[tag] === 'undefined') counts[tag] = 0;
                    counts[tag]++;
                }else
                // Разбиваем на текст на слова
                if (!make_p && tag == 'text'){
                    var words = child.nodeValue.match(/([A-Za-zА-Яа-яёЁ0-9]+|[.,:!?]+)/g);
                    if ($.isArray(words)){
                        $.each(words, function(i,v){
                            sub = sub ? sub.addNext({name:'text', val:v}) : c.addChild({name:'text', val:v});
                            if (typeof counts[tag] === 'undefined') counts[tag] = 0;
                            counts[tag]++;
                        });
                    }
                }
            }
        });
        if (!$.isEmptyObject(counts)){
            this.statistic.add(group, counts);
        }
        return list;
    };

    Bred.prototype.render = function(max, callbacks){
        return this.node.render(max, callbacks, this.statistic);
    };

    /**
     * Создание статьи с комментами
     * @param {object} tpl Шаблон статьи.
     * @returns {$}
     */
//    Bred.prototype.render = function(tpl){
//        var $article = tpl.$article.clone().show();
//        // Статья
//        $article.find(tpl.places.title).html(this.articles.root.getSentence(3, 8));
//        $article.find(tpl.places.date).text('сегодня в 11:22');
//        $article.find(tpl.places.text).html(this.articles.root.getText(this.config));
//        // Комменты
//        var com = this.comments.isEmpty() ? this.articles.root : this.comments.root;
//        var comment_list = [$article.find(tpl.places.comments)],
//            $comment,
//            i,cnt = Math.round(Math.random()*(this.config.comments.max-this.config.comments.min))+this.config.comments.min;
//        $article.find(tpl.places.comments_cnt).text(cnt);
//        var comment_cfg = {
//            words:{max: 1, min: 15},
//            paragraphs:{max: 1, min: 2},
//            sentences:{max: 1,min: 3}
//        };
//        for (i=0; i<cnt; i++){
//            $comment = tpl.$comment.clone();
//            $comment.find(tpl.places.comment.username).text((this.users.length > 0)? this.users[Math.round(Math.random() * (this.users.length-1))] : 'Гость');
//            $comment.find(tpl.places.comment.date).text('сегодня');
//            $comment.find(tpl.places.comment.text).html(com.getText(comment_cfg));
//            comment_list[Math.round(Math.random() * (comment_list.length-1))].append($comment);
//            comment_list.push($comment.find(tpl.places.comment.sub));
//        }
//        return $article;
//    };

    return Bred;

})(jQuery, Chain);