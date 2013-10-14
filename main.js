/**
 * Создание среднестатической хабра-статьи с комментариями
 * @version 1.0
 * @date 08.10.2013
 * @author Vladimir Shestakov <boolive@yandex.ru>
 */
(function($, Bred){

    $(document).ready(function(){
        var $content = $('#content'),
            $wait = $('#bred_wait'),
            $form = $('#bred_form');

        // Генерируем и показываем бред
        $form.on('submit', function(e){

            var bred = new Bred({
                quality: parseInt($form.find('[name="quality"]').val()),
                words:{
                    max: parseInt($form.find('[name="words[min]"]').val()),
                    min: parseInt($form.find('[name="words[max]"]').val())
                },
                paragraphs:{
                    max: parseInt($form.find('[name="paragraphs[min]"]').val()),
                    min: parseInt($form.find('[name="paragraphs[max]"]').val())
                },
                sentences:{
                    max: parseInt($form.find('[name="sentences[min]"]').val()),
                    min: parseInt($form.find('[name="sentences[max]"]').val())
                },
                comments:{
                    max: parseInt($form.find('[name="comments[min]"]').val()),
                    min: parseInt($form.find('[name="comments[max]"]').val())
                }
            });

            var src = $form.find('[name="src"]').val();

            $form.addClass('hide');
            $wait.show();

            $.get(src, function(data){
                // Текстовый файл дополняем минимальной html разметкой, так как бредогенератор работает с ней
                if (/\.txt$/.test(src)){

                }
                // Удаление лишних <br> и пробельных символов (чтобы небыло "пустых" текстовых узлов в DOM)
                data = data.replace(/(>)\s+/g,'$1').replace(/\s+(<)/g,'$1').replace(/(<br\/?>\s*){2,}/g,'');
                data = $('<div>').append(data);

                // Статьи из портянку обрабатываем поштучно, иначе бредогенератор выдаст новую портянку =)
                if (src == 'habr.html'){
                    var $div = $('<div>');
                    data.find('.container > article').each(function(){
                        bred.add($div.append(this)[0]);
                        $div.empty();
                    });
                }else{
                    bred.add(data[0]);
                }

                // Шаблоны статьи и комментария и области для вставки комментов
                var $comment = $('#bred_comment').remove().show();
                var $article = $('#bred_article').remove().show();
                var comments = [$article.find('.post_comments')];

                // Генерируем. Функциями обратного вызова забираем желаемые куски статьи и вставляем в шаблон хабра
                bred.render(0,{
                    '{name:article}': function(data){
                        $article.find('.post_title:first').html('Заголовок поста');
                        $article.find('.post_date:first').html('сегодня');
                        $article.find('.post_text:first').html(data);
                        $article.find('.post_comments_count:first').text(comments.length-1);
                    },
                    '{name:div,attr:{class:comment}}': function(data){
                        var c = $comment.clone();
                        c.find('time.date:first').text('15 октября 2013 в 09:24');
                        comments[Math.round(Math.random()*(comments.length-1))].append(c);
                        comments.push(c.find('.reply_comments:first'));
                    },
                    '{name:div,attr:{class:username}}': function(data){
                        $comment.find('.username:first').text(data);
                    },
                    '{name:div,attr:{class:message}}': function(data){
                        $comment.find('.message:first').html(data);
                    }
                });
                $content.append($article);
                //bred.statistic.init();
                console.log(bred);
                console.log(bred.statistic.getCounts('article'));
                $wait.hide();
            });
            return false;
        })
    });
})(jQuery, Bred);